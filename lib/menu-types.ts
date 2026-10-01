export type MenuItemDraft = {
  name: string;
  description: string;
  price: number;
  tags: string[];
};

export type MenuSectionDraft = {
  name: string;
  items: MenuItemDraft[];
};

export type MenuContent = { sections: MenuSectionDraft[] };

export type MenuAsset = {
  path: string;
  name: string;
  type: string;
  size: number;
  url?: string;
};

export const emptyMenu: MenuContent = { sections: [] };
