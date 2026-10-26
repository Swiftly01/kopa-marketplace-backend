// each enum is paired with a Record<Enum, string> so a missing label fails compilation

export enum ProductCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
}

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  [ProductCondition.NEW]: 'Brand new',
  [ProductCondition.LIKE_NEW]: 'Like new',
  [ProductCondition.GOOD]: 'Good',
  [ProductCondition.FAIR]: 'Fair',
};
