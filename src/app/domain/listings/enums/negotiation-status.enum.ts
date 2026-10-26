/** "Are you open to negotiation?" - Yes / No / Not sure. */
export enum NegotiationStatus {
  YES = 'yes',
  NO = 'no',
  NOT_SURE = 'not_sure',
}

export const NEGOTIATION_LABELS: Record<NegotiationStatus, string> = {
  [NegotiationStatus.YES]: 'Yes',
  [NegotiationStatus.NO]: 'No',
  [NegotiationStatus.NOT_SURE]: 'Not sure',
};
