export interface Tenant {
  name: string;
  phone: string;
  moveInDate: string;
  contractPeriod: number; // in months, default 12
  depositAmount: number;  // default 4500
  advancePayment: number; // default 4500
  hasPets: boolean;       // default false
}

export interface House {
  id: number;
  name: string;
  isOccupied: boolean;
  tenant: Tenant | null;
  amenities: {
    aircon: boolean;
    waterHeater: boolean;
    fridge: boolean;
    bed: boolean;
    dressingTable: boolean;
    wardrobe: boolean;
  };
}

export interface UtilityRates {
  electricityRate: number;     // 7 THB / unit
  electricityMinCharge: number; // 100 THB / month
  waterRate: number;           // 18 THB / unit
  waterMinCharge: number;       // 50 THB / month
  lateFeePerDay: number;       // 50 THB / day
  rentRate: number;            // 4500 THB / month
}

export interface Bill {
  id: string; // unique ID
  houseId: number;
  billingMonth: string; // "YYYY-MM"
  
  // Electricity
  prevElecReading: number;
  currElecReading: number;
  elecUnits: number;
  elecCharge: number;
  elecFinalCharge: number;
  elecMinApplied: boolean;
  
  // Water
  prevWaterReading: number;
  currWaterReading: number;
  waterUnits: number;
  waterCharge: number;
  waterFinalCharge: number;
  waterMinApplied: boolean;
  
  // Late Payment
  isLate: boolean;
  lateDays: number;
  lateCharge: number;
  
  // Rent and Grand Total
  rentCharge: number;
  grandTotal: number;
  
  status: 'pending' | 'paid';
  paymentDate: string | null;
  createdAt: string;
  ratesSnapshot: UtilityRates; // Snapshot rule: embed exact rates of that bill
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
}
