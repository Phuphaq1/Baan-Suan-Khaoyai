import React, { useState, useEffect } from 'react';
import { House, Bill, UtilityRates } from './types';
import HouseGrid from './components/HouseGrid';
import HouseDetail from './components/HouseDetail';
import RatesSettings from './components/RatesSettings';
import AIAssistant from './components/AIAssistant';
import Dashboard from './components/Dashboard';
import { Home, Settings, Info, Sparkles, Building, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// Seed Initial Data (Houses 1 - 10)
const INITIAL_HOUSES: House[] = Array.from({ length: 10 }, (_, index) => {
  const houseId = index + 1;
  
  // Seed some occupied houses to make the app feel alive and interactive
  let tenant = null;
  let isOccupied = false;
  
  if (houseId === 1) {
    isOccupied = true;
    tenant = {
      name: 'สมชาย รักษ์ดี',
      phone: '081-123-4567',
      moveInDate: '2025-08-10',
      contractPeriod: 12,
      depositAmount: 4500,
      advancePayment: 4500,
      hasPets: false,
    };
  } else if (houseId === 2) {
    isOccupied = true;
    tenant = {
      name: 'วรรณภา แสนสุข',
      phone: '089-876-5432',
      moveInDate: '2026-01-15',
      contractPeriod: 12,
      depositAmount: 4500,
      advancePayment: 4500,
      hasPets: true, // triggers the strict pet rule warning!
    };
  } else if (houseId === 4) {
    isOccupied = true;
    tenant = {
      name: 'กิตติภพ แย้มศรี',
      phone: '086-444-2211',
      moveInDate: '2025-12-01',
      contractPeriod: 12,
      depositAmount: 4500,
      advancePayment: 4500,
      hasPets: false,
    };
  } else if (houseId === 7) {
    isOccupied = true;
    tenant = {
      name: 'อภิสิทธิ์ แก้วสว่าง',
      phone: '082-555-0199',
      moveInDate: '2026-03-20',
      contractPeriod: 12,
      depositAmount: 4500,
      advancePayment: 4500,
      hasPets: false,
    };
  }

  return {
    id: houseId,
    name: `บ้านสวน ${houseId}`,
    isOccupied,
    tenant,
    amenities: {
      aircon: true,
      waterHeater: true,
      fridge: true,
      bed: true,
      dressingTable: true,
      wardrobe: true,
    }
  };
});

const DEFAULT_RATES: UtilityRates = {
  electricityRate: 7,
  electricityMinCharge: 100,
  waterRate: 18,
  waterMinCharge: 50,
  lateFeePerDay: 50,
  rentRate: 4500,
};

// Seed historical bills for June 2026 (2026-06)
const INITIAL_BILLS: Bill[] = [
  {
    id: '1-2026-06-seed',
    houseId: 1,
    billingMonth: '2026-06',
    prevElecReading: 1100,
    currElecReading: 1250, // 150 units * 7 = 1050 THB
    elecUnits: 150,
    elecCharge: 1050,
    elecFinalCharge: 1050,
    elecMinApplied: false,
    prevWaterReading: 420,
    currWaterReading: 435, // 15 units * 18 = 270 THB
    waterUnits: 15,
    waterCharge: 270,
    waterFinalCharge: 270,
    waterMinApplied: false,
    isLate: false,
    lateDays: 0,
    lateCharge: 0,
    rentCharge: 4500,
    grandTotal: 5820,
    status: 'paid',
    paymentDate: '2026-06-05',
    createdAt: '2026-06-01T08:00:00.000Z',
    ratesSnapshot: { ...DEFAULT_RATES }
  },
  {
    id: '2-2026-06-seed',
    houseId: 2,
    billingMonth: '2026-06',
    prevElecReading: 800,
    currElecReading: 910, // 110 units * 7 = 770 THB
    elecUnits: 110,
    elecCharge: 770,
    elecFinalCharge: 770,
    elecMinApplied: false,
    prevWaterReading: 310,
    currWaterReading: 312, // 2 units * 18 = 36 THB -> Minimum 50 THB rule triggered!
    waterUnits: 2,
    waterCharge: 36,
    waterFinalCharge: 50, // Minimum water fee applied
    waterMinApplied: true,
    isLate: false,
    lateDays: 0,
    lateCharge: 0,
    rentCharge: 4500,
    grandTotal: 5320,
    status: 'paid',
    paymentDate: '2026-06-08',
    createdAt: '2026-06-01T08:15:00.000Z',
    ratesSnapshot: { ...DEFAULT_RATES }
  },
  {
    id: '4-2026-06-seed',
    houseId: 4,
    billingMonth: '2026-06',
    prevElecReading: 2150,
    currElecReading: 2320, // 170 units * 7 = 1190 THB
    elecUnits: 170,
    elecCharge: 1190,
    elecFinalCharge: 1190,
    elecMinApplied: false,
    prevWaterReading: 680,
    currWaterReading: 698, // 18 units * 18 = 324 THB
    waterUnits: 18,
    waterCharge: 324,
    waterFinalCharge: 324,
    waterMinApplied: false,
    isLate: true,
    lateDays: 2, // 2 days * 50 = 100 THB late penalty fee!
    lateCharge: 100,
    rentCharge: 4500,
    grandTotal: 6114,
    status: 'pending', // Pending payment!
    paymentDate: null,
    createdAt: '2026-06-01T08:30:00.000Z',
    ratesSnapshot: { ...DEFAULT_RATES }
  }
];

export default function App() {
  const [houses, setHouses] = useState<House[]>(() => {
    const saved = localStorage.getItem('baansuan_houses');
    return saved ? JSON.parse(saved) : INITIAL_HOUSES;
  });

  const [bills, setBills] = useState<Bill[]>(() => {
    const saved = localStorage.getItem('baansuan_bills');
    return saved ? JSON.parse(saved) : INITIAL_BILLS;
  });

  const [currentRates, setCurrentRates] = useState<UtilityRates>(() => {
    const saved = localStorage.getItem('baansuan_rates');
    return saved ? JSON.parse(saved) : DEFAULT_RATES;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07'); // Default to current July 2026
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(1); // Default select house 1
  const [activeTab, setActiveTab] = useState<'control' | 'dashboard' | 'rates'>('control');

  // Save states to localStorage on change
  useEffect(() => {
    localStorage.setItem('baansuan_houses', JSON.stringify(houses));
  }, [houses]);

  useEffect(() => {
    localStorage.setItem('baansuan_bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('baansuan_rates', JSON.stringify(currentRates));
  }, [currentRates]);

  const handleUpdateHouse = (updatedHouse: House) => {
    setHouses(prev => prev.map(h => h.id === updatedHouse.id ? updatedHouse : h));
  };

  const handleSaveBill = (newBill: Bill) => {
    setBills(prev => {
      // If a bill for this house and month already exists, overwrite it (edit)
      const exists = prev.some(b => b.houseId === newBill.houseId && b.billingMonth === newBill.billingMonth);
      if (exists) {
        return prev.map(b => (b.houseId === newBill.houseId && b.billingMonth === newBill.billingMonth) ? newBill : b);
      }
      return [...prev, newBill];
    });
  };

  const handleDeleteBill = (billId: string) => {
    if (confirm('คุณต้องการลบข้อมูลประวัติการคำนวณบิลนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      setBills(prev => prev.filter(b => b.id !== billId));
    }
  };

  const handleSaveRates = (updatedRates: UtilityRates) => {
    setCurrentRates(updatedRates);
  };

  // Compute overall status analytics
  const occupiedCount = houses.filter(h => h.isOccupied).length;
  const vacantCount = 10 - occupiedCount;
  
  const billsForSelectedMonth = bills.filter(b => b.billingMonth === selectedMonth);
  const paidCount = billsForSelectedMonth.filter(b => b.status === 'paid').length;
  const pendingCount = billsForSelectedMonth.filter(b => b.status === 'pending').length;
  const uncalculatedCount = occupiedCount - billsForSelectedMonth.length;

  const totalRevenue = billsForSelectedMonth
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.grandTotal, 0);

  const selectedHouse = houses.find(h => h.id === selectedHouseId);

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans">
      
      {/* Primary Header Layout */}
      <header className="bg-white text-natural-text shadow-xs border-b border-natural-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-natural-primary rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md shadow-natural-primary/10">
              BS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-serif font-bold tracking-tight text-natural-accent">บ้านสวน <span className="font-light text-sm opacity-60 ml-1 uppercase tracking-widest">Property Manager</span></h1>
                <span className="bg-natural-primary/10 text-natural-primary text-3xs font-medium px-2.5 py-0.5 rounded-full border border-natural-primary/10">
                  ระบบผู้ช่วยจัดการ
                </span>
              </div>
              <p className="text-xs text-natural-text/60 font-light mt-0.5">ระบบผู้ช่วยคำนวณบิลค่าน้ำค่าไฟ จัดการสัญญาผู้เช่า และออกใบแจ้งหนี้แม่นยำ</p>
            </div>
          </div>

          {/* Navigation Controls and Month Selector */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex bg-natural-primary/5 border border-natural-border p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('control')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'control'
                    ? 'bg-natural-primary text-white shadow-xs'
                    : 'text-natural-text/60 hover:text-natural-text'
                }`}
              >
                🏠 แผงควบคุมบ้านพัก
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-natural-primary text-white shadow-xs'
                    : 'text-natural-text/60 hover:text-natural-text'
                }`}
              >
                📊 แดชบอร์ดสรุป
              </button>
              <button
                onClick={() => setActiveTab('rates')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'rates'
                    ? 'bg-natural-primary text-white shadow-xs'
                    : 'text-natural-text/60 hover:text-natural-text'
                }`}
              >
                ⚙️ ตั้งค่าเรทค่าน้ำค่าไฟ
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-white border border-natural-border px-3 py-1.5 rounded-xl">
              <span className="text-3xs font-semibold text-natural-text/50 uppercase tracking-wider">รอบเดือน:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs text-natural-text border-none outline-none focus:ring-0 font-mono font-bold"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Summary Analytics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-natural-border p-4 shadow-2xs">
            <span className="text-4xs text-natural-text/50 font-medium block uppercase tracking-wider">อัตราการจอง (Occupancy)</span>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <strong className="text-2xl font-serif font-bold text-natural-accent font-mono">{occupiedCount}</strong>
              <span className="text-xs text-natural-text/60">/ 10 หลัง</span>
            </div>
            <div className="mt-2 text-4xs text-natural-primary font-medium bg-natural-primary/5 inline-block px-2 py-0.5 rounded-md border border-natural-primary/10">
              คิดเป็น {occupiedCount * 10}% ของโครงการ
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-natural-border p-4 shadow-2xs">
            <span className="text-4xs text-natural-text/50 font-medium block uppercase tracking-wider">บ้านว่าง (Vacant)</span>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <strong className="text-2xl font-serif font-bold text-natural-accent font-mono">{vacantCount}</strong>
              <span className="text-xs text-natural-text/60">/ 10 หลัง</span>
            </div>
            <div className="mt-2 text-4xs text-natural-text/60 font-medium bg-natural-primary/5 inline-block px-2 py-0.5 rounded-md border border-natural-border/50">
              พร้อมเข้าอยู่ได้ทันที
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-natural-border p-4 shadow-2xs">
            <span className="text-4xs text-natural-text/50 font-medium block uppercase tracking-wider">คำนวณบิลแล้ว (Bills Ready)</span>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <strong className="text-2xl font-serif font-bold text-natural-accent font-mono">{billsForSelectedMonth.length}</strong>
              <span className="text-xs text-natural-text/60">/ {occupiedCount} หลังที่อยู่</span>
            </div>
            <div className="mt-2 text-4xs flex items-center">
              {uncalculatedCount > 0 ? (
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium border border-amber-100">เหลือค้างทำ {uncalculatedCount} หลัง</span>
              ) : (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-100">คำนวณครบเรียบร้อย</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-natural-border p-4 shadow-2xs">
            <span className="text-4xs text-natural-text/50 font-medium block uppercase tracking-wider">รอชำระค่าเช่า (Unpaid Invoices)</span>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <strong className="text-2xl font-serif font-bold text-orange-700 font-mono">{pendingCount}</strong>
              <span className="text-xs text-natural-text/60">บิลค้างจ่าย</span>
            </div>
            <div className="mt-2 text-4xs text-orange-700 font-medium bg-orange-50 border border-orange-100 inline-block px-2 py-0.5 rounded-md">
              เริ่มคิดค่าปรับเมื่อพ้นกำหนด
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-natural-border p-4 shadow-2xs col-span-2 md:col-span-1">
            <span className="text-4xs text-natural-text/50 font-medium block uppercase tracking-wider">รายได้ที่รับแล้ว (Paid Revenue)</span>
            <div className="flex items-baseline space-x-1.5 mt-2">
              <strong className="text-2xl font-serif font-bold text-natural-primary font-mono">{totalRevenue.toLocaleString()}</strong>
              <span className="text-xs text-natural-text/60">บาท</span>
            </div>
            <div className="mt-2 text-4xs text-natural-primary font-medium bg-natural-primary/5 border border-natural-primary/10 inline-block px-2 py-0.5 rounded-md">
              ชำระสำเร็จ {paidCount} บิล
            </div>
          </div>
        </div>

        {/* Dynamic Panels */}
        {activeTab === 'rates' ? (
          <RatesSettings currentRates={currentRates} onSaveRates={handleSaveRates} />
        ) : activeTab === 'dashboard' ? (
          <Dashboard bills={bills} houses={houses} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Columns: Main Control Panel & House Details */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* House Grid Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-500" />
                    แผนผังโครงการบ้านพัก (10 Houses)
                  </h3>
                  <span className="text-3xs text-slate-400">คลิกที่การ์ดบ้านเพื่อเลือกจัดการและออกยอดบิล</span>
                </div>
                <HouseGrid
                  houses={houses}
                  bills={bills}
                  selectedMonth={selectedMonth}
                  onSelectHouse={setSelectedHouseId}
                  selectedHouseId={selectedHouseId}
                />
              </div>

              {/* Active Selected House Management */}
              {selectedHouse ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 text-sm">
                      แผงจัดการเชิงลึก: {selectedHouse.name}
                    </h3>
                  </div>
                  <HouseDetail
                    house={selectedHouse}
                    bills={bills}
                    selectedMonth={selectedMonth}
                    currentRates={currentRates}
                    onUpdateHouse={handleUpdateHouse}
                    onSaveBill={handleSaveBill}
                    onDeleteBill={handleDeleteBill}
                  />
                </div>
              ) : (
                <div className="text-center py-16 bg-white border border-slate-200/60 rounded-2xl text-slate-400">
                  <Home className="w-12 h-12 text-slate-200 mx-auto stroke-[1.2] mb-2" />
                  <p className="text-sm font-medium">กรุณาเลือกบ้านสวนสักหลังด้านบนเพื่อจัดการ</p>
                </div>
              )}

            </div>

            {/* Right Column: AI Assistant Companion */}
            <div className="lg:col-span-1 space-y-6">
              <div className="sticky top-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    ผู้ช่วยผู้จัดการบ้านพัก (AI Assistant)
                  </span>
                  <span className="text-4xs text-slate-400 font-light">ข้อมูลเชื่อมโยงล่าสุดอัตโนมัติ</span>
                </div>
                <AIAssistant
                  houses={houses}
                  bills={bills}
                  selectedMonth={selectedMonth}
                />
              </div>
            </div>

          </div>
        )}

      </main>

      <footer className="px-8 py-6 bg-white border-t border-natural-border flex flex-col sm:flex-row justify-between items-center text-[10px] font-sans font-bold uppercase tracking-widest text-natural-text/40 gap-4 mt-16 rounded-t-2xl">
        <div>โครงการบ้านสวน • ระบบจัดการอัตโนมัติ V1.2</div>
        <div className="text-center sm:text-right">
          <div>© 2026 BAAN SUAN PROPERTY MANAGEMENT SERVICE</div>
          <div className="text-[9px] mt-1 normal-case tracking-normal font-light">รองรับการจดเลขอ่าน คำนวณข้ามเดือน ตรวจค่าน้ำไฟขั้นต่ำ และสแนปช็อตเรทค่าบริการ • ห้ามเลี้ยงสัตว์ 🚫</div>
        </div>
      </footer>

    </div>
  );
}
