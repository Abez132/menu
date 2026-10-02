"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import type { MenuAsset, MenuContent, MenuItemDraft, MenuSectionDraft } from "@/lib/menu-types";
import { confirmAndPublishMenu, saveMenuDraft } from "./actions";

const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 5 * 1024 * 1024;
const initialState = {};

function blankItem(): MenuItemDraft { return { name: "", description: "", price: 0, tags: [] }; }

export function MenuEditor({ restaurantId, versionId, initialContent, initialAssets, updatedAt, canPublish }: {
  restaurantId: string;
  versionId: string;
  initialContent: MenuContent;
  initialAssets: MenuAsset[];
  updatedAt: string;
  canPublish: boolean;
}) {
  const [sections, setSections] = useState<MenuSectionDraft[]>(initialContent.sections ?? []);
  const [assets, setAssets] = useState<MenuAsset[]>(initialAssets);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  const [saveState, setSaveState] = useState<{ error?: string; success?: string }>(initialState);
  const [publishState, setPublishState] = useState<{ error?: string; success?: string }>(initialState);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [savedContent, setSavedContent] = useState(JSON.stringify(initialContent));
  const [savedAssets, setSavedAssets] = useState(JSON.stringify(initialAssets.map(({ path, name, type, size }) => ({ path, name, type, size }))));
  const content = useMemo(() => JSON.stringify({ sections }), [sections]);
  const assetJson = useMemo(() => JSON.stringify(assets.map(({ path, name, type, size }) => ({ path, name, type, size }))), [assets]);
  const itemCount = sections.reduce((count, section) => count + section.items.length, 0);
  const dirty = content !== savedContent || assetJson !== savedAssets;

  function updateSection(index: number, update: (section: MenuSectionDraft) => MenuSectionDraft) {
    setSections((current) => current.map((section, sectionIndex) => sectionIndex === index ? update(section) : section));
  }
  function updateItem(sectionIndex: number, itemIndex: number, update: (item: MenuItemDraft) => MenuItemDraft) {
    updateSection(sectionIndex, (section) => ({ ...section, items: section.items.map((item, index) => index === itemIndex ? update(item) : item) }));
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setUploadError("");
    if (assets.length + files.length > 10) { setUploadError("You can attach up to 10 menu files."); return; }
    const invalid = files.find((file) => !acceptedTypes.has(file.type) || file.size > maxFileSize || file.size < 1);
    if (invalid) { setUploadError(`${invalid.name} must be a PDF, JPG, PNG, or WebP under 5 MB.`); return; }

    setUploading(true);
    const uploaded: MenuAsset[] = [];
    try {
      const supabase = createClient();
      for (const file of files) {
        const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
        const path = `${restaurantId}/${versionId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("menu-files").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(`Couldn’t upload ${file.name}: ${error.message}`);
        const { data: signed, error: signedError } = await supabase.storage.from("menu-files").createSignedUrl(path, 60 * 60);
        if (signedError) {
          await supabase.storage.from("menu-files").remove([path]);
          throw new Error(`The file was uploaded, but its preview could not be opened: ${signedError.message}`);
        }
        uploaded.push({ path, name: file.name, type: file.type, size: file.size, url: signed?.signedUrl });
      }
      setAssets((current) => [...current, ...uploaded]);
    } catch (error) {
      if (uploaded.length) await createClient().storage.from("menu-files").remove(uploaded.map((asset) => asset.path));
      setUploadError(error instanceof Error ? error.message : "The files could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveState({});
    const formData = new FormData(event.currentTarget);
    const result = await saveMenuDraft(initialState, formData);
    setSaveState(result);
    if (result.success) {
      setSavedAt(new Date().toISOString());
      setSavedContent(content);
      setSavedAssets(assetJson);
    }
    setSaving(false);
  }

  async function publishMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPublishing(true);
    setPublishState({});
    const result = await confirmAndPublishMenu(initialState, new FormData(event.currentTarget));
    setPublishState(result);
    setPublishing(false);
    if (result.success) router.refresh();
  }

  async function removeAsset(path: string) {
    setAssets((current) => current.filter((file) => file.path !== path));
    const uploadedInThisDraft = path.split("/")[1] === versionId && !initialAssets.some((asset) => asset.path === path);
    if (uploadedInThisDraft) {
      const { error } = await createClient().storage.from("menu-files").remove([path]);
      if (error) setUploadError("The file was removed from this draft, but its stored copy could not be deleted yet.");
    }
  }

  const saveMessage = saveState.error ? { kind: "error", text: saveState.error } : saveState.success ? { kind: "success", text: saveState.success } : null;
  const publishMessage = publishState.error ? { kind: "error", text: publishState.error } : publishState.success ? { kind: "success", text: publishState.success } : null;

  return <div className="menu-studio">
    <div className="menu-studio-heading"><div><p className="owner-menu-status">Draft menu · saved {new Date(savedAt).toLocaleString("en-ET", { dateStyle: "medium", timeStyle: "short" })}</p><h2>Build your menu</h2><p>Add items and sections, attach a photo or PDF, or do both. Your draft stays private until you confirm it.</p></div><span>{itemCount} {itemCount === 1 ? "item" : "items"}</span></div>
    <form onSubmit={saveDraft}>
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="assets" value={assetJson} />
      <div className="menu-studio-section-heading"><div><span className="owner-kicker">01 · STRUCTURED MENU</span><h3>Sections and dishes</h3></div><button type="button" className="menu-add-button" onClick={() => setSections((current) => [...current, { name: "", items: [blankItem()] }])}>+ Add a section</button></div>
      {sections.length === 0 ? <div className="menu-editor-empty"><span>☷</span><strong>No sections yet</strong><p>Add dishes such as breakfast, mains, drinks, or desserts.</p><button type="button" className="menu-add-button" onClick={() => setSections([{ name: "", items: [blankItem()] }])}>Add your first section</button></div> : sections.map((section, sectionIndex) => <section className="menu-editor-section" key={sectionIndex}>
        <div className="menu-editor-section-top"><label className="form-field"><span>SECTION NAME <span>*</span></span><input value={section.name} maxLength={80} placeholder="e.g. Main dishes" onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, name: event.target.value }))} /></label><button type="button" className="menu-remove-button" onClick={() => setSections((current) => current.filter((_, index) => index !== sectionIndex))}>Remove section</button></div>
        {section.items.map((item, itemIndex) => <div className="menu-editor-item" key={itemIndex}>
          <div className="menu-editor-item-heading"><strong>Dish {itemIndex + 1}</strong><button type="button" className="menu-remove-button" onClick={() => updateSection(sectionIndex, (current) => ({ ...current, items: current.items.filter((_, index) => index !== itemIndex) }))}>Remove dish</button></div>
          <div className="form-grid">
            <label className="form-field"><span>DISH NAME <span>*</span></span><input maxLength={100} value={item.name} placeholder="e.g. Doro wat" onChange={(event) => updateItem(sectionIndex, itemIndex, (current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="form-field"><span>PRICE IN BIRR <span>*</span></span><input type="number" min="0" max="10000000" step="1" value={item.price} onChange={(event) => updateItem(sectionIndex, itemIndex, (current) => ({ ...current, price: Number(event.target.value) }))} /></label>
            <label className="form-field form-field-wide"><span>DESCRIPTION</span><textarea maxLength={300} rows={2} value={item.description} placeholder="A short description customers will see" onChange={(event) => updateItem(sectionIndex, itemIndex, (current) => ({ ...current, description: event.target.value }))} /></label>
            <label className="form-field form-field-wide"><span>DIETARY OR POPULAR TAGS</span><input value={item.tags.join(", ")} placeholder="e.g. Vegetarian, Popular" onChange={(event) => updateItem(sectionIndex, itemIndex, (current) => ({ ...current, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8) }))} /></label>
          </div>
        </div>)}
        <button type="button" className="menu-add-inline" onClick={() => updateSection(sectionIndex, (current) => ({ ...current, items: [...current.items, blankItem()] }))}>+ Add a dish</button>
      </section>)}

      <div className="menu-studio-section-heading menu-upload-heading"><div><span className="owner-kicker">02 · PHOTO OR PDF</span><h3>Upload a menu file</h3><p>Add a clear menu photo or PDF. You can include more than one page or file.</p></div></div>
      <label className={`menu-upload-drop${uploading ? " is-uploading" : ""}`}><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple disabled={uploading || assets.length >= 10} onChange={uploadFiles} /><span className="menu-upload-icon">↑</span><strong>{uploading ? "Uploading menu files…" : "Choose photos or PDFs"}</strong><small>PDF, JPG, PNG, or WebP · Up to 10 files · 5 MB each</small></label>
      {uploadError && <p className="menu-action-message error" role="alert">{uploadError}</p>}
      {assets.length > 0 && <div className="menu-file-list">{assets.map((asset) => <div className="menu-file-card" key={asset.path}>{asset.type.startsWith("image/") && asset.url ? <a href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt="Uploaded menu preview" /></a> : <span className="menu-file-pdf">PDF</span>}<div><strong>{asset.url ? <a href={asset.url} target="_blank" rel="noreferrer">{asset.name} · preview</a> : asset.name}</strong><small>{(asset.size / (1024 * 1024)).toFixed(1)} MB</small></div><button type="button" aria-label={`Remove ${asset.name}`} onClick={() => removeAsset(asset.path)}>×</button></div>)}</div>}
      {saveMessage && <p className={`menu-action-message ${saveMessage.kind}`} role="status">{saveMessage.text}</p>}
      <button className="owner-submit menu-save-button" type="submit" disabled={saving || uploading}>{saving ? "Saving draft…" : "Save menu draft"}<span>↓</span></button>
    </form>

    <section className="menu-review-card"><span className="owner-kicker">03 · YOUR REVIEW</span><h3>Preview and confirm</h3><p>Check every dish, price, and file. When you confirm, this menu becomes public on your restaurant page. Any older confirmed menu is replaced at the same time.</p>
      {sections.length > 0 && <div className="menu-review-preview">{sections.map((section, sectionIndex) => <div key={sectionIndex}><strong>{section.name || "Unnamed section"}</strong>{section.items.map((item, itemIndex) => <article className="menu-review-item" key={itemIndex}><p>{item.name || "Unnamed dish"}<span>ETB {new Intl.NumberFormat("en-ET").format(item.price || 0)}</span></p>{item.description && <small>{item.description}</small>}{item.tags.length > 0 && <small className="menu-review-tags">{item.tags.join(" · ")}</small>}</article>)}</div>)}</div>}
      {assets.map((asset) => asset.url && asset.type.startsWith("image/") ? <img className="menu-review-image" src={asset.url} alt={`Preview of ${asset.name}`} key={asset.path} /> : null)}
      {canPublish ? <form onSubmit={publishMenu} className="menu-confirm-form"><input type="hidden" name="versionId" value={versionId} /><label className="menu-confirm-check"><input type="checkbox" name="confirmAccuracy" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I checked the menu and confirm these details and prices are accurate.</span></label>{publishMessage && <p className={`menu-action-message ${publishMessage.kind}`} role="status">{publishMessage.text}</p>}<button className="owner-submit" type="submit" disabled={!confirmed || dirty || uploading || saving || publishing}>{publishing ? "Publishing menu…" : dirty ? "Save draft before confirming" : "Confirm and publish menu"}<span>✓</span></button></form> : <div className="admin-notice">This draft is private while your restaurant is under review. After approval, you can check it again and confirm it before it goes public.</div>}
    </section>
  </div>;
}
