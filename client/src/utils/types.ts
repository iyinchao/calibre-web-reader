export interface BookInfo {
  uuid: string;
  title: string;
  cover: string;
  formats: string[];
  authors: string;
  comments: string;
}

export interface BookTocType {
  id: number;
  label: string;
  href?: string;
  subitems?: BookTocType[] | null;
}
