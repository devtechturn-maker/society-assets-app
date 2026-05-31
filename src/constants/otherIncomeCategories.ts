export type OtherIncomeCategoryOption = {
  label: string;
  value: string;
};

export const OTHER_INCOME_CATEGORY_OPTIONS: OtherIncomeCategoryOption[] = [
  { label: 'Transfer fees (sale / transfer)', value: 'TRANSFER_FEES' },
  { label: 'Amenity / facility charges', value: 'AMENITY_CHARGES' },
  { label: 'Parking (visitor / extra slot)', value: 'PARKING_FEES' },
  { label: 'Community hall / party hall rent', value: 'HALL_RENT' },
  { label: 'Clubhouse / gym / pool charges', value: 'CLUBHOUSE_CHARGES' },
  { label: 'DG / power backup charges', value: 'DG_CHARGES' },
  { label: 'Water tanker / meter charges', value: 'WATER_CHARGES' },
  { label: 'Moving / shifting deposit', value: 'SHIFTING_DEPOSIT' },
  { label: 'Late payment / penalty (non-maintenance)', value: 'MISCELLANEOUS_PENALTY' },
  { label: 'Interest on deposits', value: 'DEPOSIT_INTEREST' },
  { label: 'Other', value: 'OTHER' },
];
