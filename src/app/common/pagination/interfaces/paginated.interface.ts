export interface Paginated<T> {
  data: T[];
  meta: {
    itemsPerPage: number;
    totalItems: number;
    currentPage: number;
    totalPages: number;
  };
  links: {
    first: string | null;
    last: string | null;
    current: string | null;
    next?: string | null;
    previous?: string | null;
  };
}
