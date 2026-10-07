"use client";

import { useActionState } from "react";
import { submitMenuReport } from "./actions";

export function MenuReportForm({
  restaurantId,
  versionId,
}: {
  restaurantId: string;
  versionId: string;
}) {
  const [state, action, pending] = useActionState(submitMenuReport, {});
  return (
    <form action={action} className="menu-report-form">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="versionId" value={versionId} />
      <label className="form-field">
        <span>WHAT NEEDS A CHECK?</span>
        <select name="issueType" required defaultValue="">
          <option value="" disabled>
            Choose an issue
          </option>
          <option value="incorrect_price">Price looks incorrect</option>
          <option value="incorrect_item">Dish details look incorrect</option>
          <option value="menu_out_of_date">Menu may be out of date</option>
          <option value="file_problem">
            Menu photo or PDF is hard to read
          </option>
          <option value="other">Something else</option>
        </select>
      </label>
      <label className="form-field">
        <span>WHAT DID YOU NOTICE?</span>
        <textarea
          name="message"
          rows={4}
          minLength={20}
          maxLength={1000}
          required
          placeholder="Tell us which dish or menu detail should be checked."
        />
      </label>
      <label className="form-field">
        <span>
          YOUR EMAIL <small>(optional, if we need to follow up)</small>
        </span>
        <input
          type="email"
          name="contact"
          maxLength={254}
          placeholder="you@example.com"
        />
      </label>
      {state.error && (
        <p className="menu-action-message error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="menu-action-message success" role="status">
          {state.success}
        </p>
      )}
      {!state.success && (
        <button className="owner-submit" type="submit" disabled={pending}>
          {pending ? "Sending report…" : "Send report"}
          <span>→</span>
        </button>
      )}
    </form>
  );
}
