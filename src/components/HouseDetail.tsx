import React, { useState, useEffect } from 'react';
import { House, Tenant, Bill, UtilityRates } from '../types';
import { User, ShieldAlert, Zap, Droplet, Clock, Calculator, Save, FileText, Check, AlertCircle, Trash2, Eye, Clipboard, Smile, ShieldCheck } from 'lucide-react';

interface HouseDetailProps {
  house: House;
  bills: Bill[];
  selectedMonth: string;
  currentRates: UtilityRates;
  onUpdateHouse: (updatedHouse: House) => void;
  onSaveBill: (bill: Bill) => void;
  onDeleteBill: (billId: string) => void;
}

export default function HouseDetail({
  house,
  bills,
  selectedMonth,
  currentRates,
  onUpdateHouse,
  onSaveBill,
  onDeleteBill,
}: HouseDetailProps) {
  const [activeTab, setActiveTab] = useState<'tenant' | 'billing' | 'history'>('billing');

  // Tenant form state
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [contractPeriod, setContractPeriod] = useState(12);
  const [hasPets, setHasPets] = useState(false);
  const [amenities, setAmenities] = useState({
    aircon: true,
    waterHeater: true,
    fridge: true,
    bed: true,
    dressingTable: true,
    wardrobe: true,
  });

  // Billing form state
  const [currElec, setCurrElec] = useState<string>('');
  const [prevElec, setPrevElec] = useState<string>('');
  const [currWater, setCurrWater] = useState<string>('');
  const [prevWater, setPrevWater] = useState<string>('');
  const [isLate, setIsLate] = useState(false);
  const [lateDays, setLateDays] = useState<string>('0');
  
  // Computed preview state
  const [computedBill, setComputedBill] = useState<Partial<Bill> | null>(null);
  const [isSavedNotify, setIsSavedNotify] = useState(false);
  const [copiedBillId, setCopiedBillId] = useState<string | null>(null);
  const [printBill, setPrintBill] = useState<Bill | null>(null);

  // Load house tenant into form states when house changes
  useEffect(() => {
    if (house.tenant) {
      setTenantName(house.tenant.name);
      setTenantPhone(house.tenant.phone);
      setMoveInDate(house.tenant.moveInDate);
      setContractPeriod(house.tenant.contractPeriod);
      setHasPets(house.tenant.hasPets);
    } else {
      setTenantName('');
      setTenantPhone('');
      setMoveInDate(new Date().toISOString().substring(0, 10));
      setContractPeriod(12);
      setHasPets(false);
    }
    setAmenities(house.amenities);

    // Auto-prefill previous meter readings from last month's finalized bill if available
    const houseBills = bills.filter(b => b.houseId === house.id).sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
    
    // Look for a bill from the month prior to current selectedMonth
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevMonthDate = new Date(year, month - 2, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    
    const prevBill = bills.find(b => b.houseId === house.id && b.billingMonth === prevMonthStr);
    
    if (prevBill) {
      setPrevElec(prevBill.currElecReading.toString());
      setPrevWater(prevBill.currWaterReading.toString());
    } else if (houseBills.length > 0) {
      // fallback to the absolute latest bill readings as previous
      setPrevElec(houseBills[0].currElecReading.toString());
      setPrevWater(houseBills[0].currWaterReading.toString());
    } else {
      setPrevElec('0');
      setPrevWater('0');
    }

    // Reset current readings & computed preview
    const activeBillForMonth = bills.find(b => b.houseId === house.id && b.billingMonth === selectedMonth);
    if (activeBillForMonth) {
      setCurrElec(activeBillForMonth.currElecReading.toString());
      setPrevElec(activeBillForMonth.prevElecReading.toString());
      setCurrWater(activeBillForMonth.currWaterReading.toString());
      setPrevWater(activeBillForMonth.prevWaterReading.toString());
      setIsLate(activeBillForMonth.isLate);
      setLateDays(activeBillForMonth.lateDays.toString());
      setComputedBill(activeBillForMonth);
    } else {
      setCurrElec('');
      setIsLate(false);
      setLateDays('0');
      setComputedBill(null);
    }
  }, [house, selectedMonth, bills]);

  // Handle saving Tenant registration
  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTenant: Tenant | null = tenantName.trim() ? {
      name: tenantName,
      phone: tenantPhone,
      moveInDate,
      contractPeriod,
      depositAmount: currentRates.rentRate, // 4,500
      advancePayment: currentRates.rentRate, // 4,500
      hasPets,
    } : null;

    onUpdateHouse({
      ...house,
      isOccupied: updatedTenant !== null,
      tenant: updatedTenant,
      amenities
    });
    
    // Show visual confirmation
    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 2500);
  };

  // Run billing calculation logic
  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    
    const curE = parseFloat(currElec) || 0;
    const prevE = parseFloat(prevElec) || 0;
    const curW = parseFloat(currWater) || 0;
    const prevW = parseFloat(prevWater) || 0;
    const daysL = isLate ? (parseInt(lateDays) || 0) : 0;

    if (curE < prevE) {
      alert('คำเตือน: เลขมิเตอร์ไฟปัจจุบันน้อยกว่าเลขมิเตอร์ก่อนหน้า โปรดตรวจสอบความถูกต้อง');
      return;
    }
    if (curW < prevW) {
      alert('คำเตือน: เลขมิเตอร์น้ำปัจจุบันน้อยกว่าเลขมิเตอร์ก่อนหน้า โปรดตรวจสอบความถูกต้อง');
      return;
    }

    // 1. Rent Charge
    const rentCharge = currentRates.rentRate;

    // 2. Electricity Charge
    const elecUnits = curE - prevE;
    const rawElecCharge = elecUnits * currentRates.electricityRate;
    let elecFinalCharge = rawElecCharge;
    let elecMinApplied = false;

    if (elecFinalCharge < currentRates.electricityMinCharge) {
      elecFinalCharge = currentRates.electricityMinCharge;
      elecMinApplied = true;
    }

    // 3. Water Charge
    const waterUnits = curW - prevW;
    const rawWaterCharge = waterUnits * currentRates.waterRate;
    let waterFinalCharge = rawWaterCharge;
    let waterMinApplied = false;

    if (waterFinalCharge < currentRates.waterMinCharge) {
      waterFinalCharge = currentRates.waterMinCharge;
      waterMinApplied = true;
    }

    // 4. Late Charge Fee
    const lateCharge = daysL * currentRates.lateFeePerDay;

    // 5. Grand Total
    const grandTotal = rentCharge + elecFinalCharge + waterFinalCharge + lateCharge;

    const previewBill: Partial<Bill> = {
      id: `${house.id}-${selectedMonth}`,
      houseId: house.id,
      billingMonth: selectedMonth,
      prevElecReading: prevE,
      currElecReading: curE,
      elecUnits,
      elecCharge: rawElecCharge,
      elecFinalCharge,
      elecMinApplied,
      prevWaterReading: prevW,
      currWaterReading: curW,
      waterUnits,
      waterCharge: rawWaterCharge,
      waterFinalCharge,
      waterMinApplied,
      isLate,
      lateDays: daysL,
      lateCharge,
      rentCharge,
      grandTotal,
      status: 'pending', // defaults to pending till paid
      ratesSnapshot: { ...currentRates } // embed snapshot
    };

    setComputedBill(previewBill);
  };

  // Finalize and save bill (commits snapshot)
  const handleFinalizeBill = () => {
    if (!computedBill) return;
    
    const finalized: Bill = {
      ...(computedBill as Bill),
      id: computedBill.id || `${house.id}-${selectedMonth}-${Date.now()}`,
      createdAt: computedBill.createdAt || new Date().toISOString(),
      paymentDate: computedBill.paymentDate || null,
    };

    onSaveBill(finalized);
    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 2500);
  };

  // Toggle paid/unpaid status
  const handleTogglePaid = (billId: string, currentStatus: 'pending' | 'paid') => {
    bills.map(b => {
      if (b.id === billId) {
        const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
        const updatedBill: Bill = {
          ...b,
          status: nextStatus as 'pending' | 'paid',
          paymentDate: nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : null
        };
        onSaveBill(updatedBill);
        if (computedBill && computedBill.id === billId) {
          setComputedBill(updatedBill);
        }
      }
    });
  };

  // Generate text invoice for Line / Clipboard
  const getInvoiceText = (billItem: Bill) => {
    const [year, month] = billItem.billingMonth.split('-');
    const monthNamesThai = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const thaiMonth = monthNamesThai[parseInt(month) - 1];
    const thaiYear = parseInt(year) + 543; // Buddhist Era

    return `🏠 ใบแจ้งยอดค่าใช้จ่าย โครงการ "บ้านสวน"
----------------------------------------
บ้านเลขที่: ${house.name}
ประจำรอบเดือน: ${thaiMonth} ${thaiYear}
ผู้เช่า: คุณ ${house.tenant?.name || '-'}
----------------------------------------
1. ค่าเช่าบ้านรายเดือน: ${billItem.rentCharge.toLocaleString()} บาท
2. ค่าไฟฟ้า (จดครั้งก่อน ${billItem.prevElecReading} - ครั้งนี้ ${billItem.currElecReading})
   - จำนวนที่ใช้: ${billItem.elecUnits} หน่วย
   - อัตรา: หน่วยละ ${billItem.ratesSnapshot.electricityRate} บาท
   - ค่าไฟจริง: ${billItem.elecCharge.toLocaleString()} บาท
   ${billItem.elecMinApplied ? `- ค่าธรรมเนียมขั้นต่ำ: คิดเหมา ${billItem.ratesSnapshot.electricityMinCharge} บาท` : ''}
   - สรุปค่าไฟฟ้าเดือนนี้: ${billItem.elecFinalCharge.toLocaleString()} บาท

3. ค่าน้ำประปา (จดครั้งก่อน ${billItem.prevWaterReading} - ครั้งนี้ ${billItem.currWaterReading})
   - จำนวนที่ใช้: ${billItem.waterUnits} หน่วย
   - อัตรา: หน่วยละ ${billItem.ratesSnapshot.waterRate} บาท
   - ค่าน้ำจริง: ${billItem.waterCharge.toLocaleString()} บาท
   ${billItem.waterMinApplied ? `- ค่าธรรมเนียมขั้นต่ำ: คิดเหมา ${billItem.ratesSnapshot.waterMinCharge} บาท` : ''}
   - สรุปค่าน้ำประปาเดือนนี้: ${billItem.waterFinalCharge.toLocaleString()} บาท

4. ค่าปรับชำระล่าช้า: ${billItem.lateCharge.toLocaleString()} บาท (${billItem.lateDays} วัน)
----------------------------------------
💰 ยอดรวมสุทธิที่ต้องชำระ: ${billItem.grandTotal.toLocaleString()} บาท
สถานะ: ${billItem.status === 'paid' ? 'ชำระเงินเรียบร้อยแล้ว' : 'รอการชำระเงิน'}
----------------------------------------
* กรุณาชำระเงินตามช่องทางธนาคารของโครงการ
* ขอบพระคุณอย่างยิ่งค่ะ 🙏`;
  };

  const handleCopyInvoice = (billItem: Bill) => {
    const txt = getInvoiceText(billItem);
    navigator.clipboard.writeText(txt);
    setCopiedBillId(billItem.id);
    setTimeout(() => setCopiedBillId(null), 2000);
  };

  const handleExportPDF = (billItem: Bill) => {
    setPrintBill(billItem);
  };

  const houseBills = bills.filter(b => b.houseId === house.id).sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
  const hasPendingBill = bills.some(b => b.houseId === house.id && b.billingMonth === selectedMonth && b.status === 'pending');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden animate-fade-in flex flex-col md:flex-row min-h-[500px] font-sans">
      
      {/* Left Sidebar: House summary and navigation */}
      <div className="md:w-1/4 bg-natural-primary/[0.03] p-6 border-r border-natural-border flex flex-col justify-between">
        <div className="space-y-6">
          <div>
            <div className="flex items-center space-x-2 text-natural-text/50 text-3xs font-semibold uppercase tracking-wider mb-1">
              <span>รายละเอียดบ้านพัก</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-natural-accent">{house.name}</h2>
            
            <div className="mt-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block border ${
                house.isOccupied
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-natural-primary/5 text-natural-text/60 border-natural-border'
              }`}>
                {house.isOccupied ? 'มีผู้เช่าปัจจุบัน' : 'บ้านว่าง (พร้อมจอง)'}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          {house.isOccupied && house.tenant && (
            <div className="space-y-3 bg-white border border-natural-border p-4 rounded-xl shadow-2xs">
              <div className="text-xs text-natural-text/70 font-light space-y-2">
                <p className="flex items-center gap-1.5 text-natural-text">
                  <User className="w-3.5 h-3.5 text-natural-primary/60" />
                  <strong>ผู้เช่า:</strong> <span className="font-normal text-natural-accent font-bold">{house.tenant.name}</span>
                </p>
                <p>
                  <strong>เบอร์โทร:</strong> <span className="font-mono">{house.tenant.phone || '-'}</span>
                </p>
                <p>
                  <strong>เริ่มเช่า:</strong> {new Date(house.tenant.moveInDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                </p>
                <p>
                  <strong>ระยะสัญญา:</strong> {house.tenant.contractPeriod} เดือน
                </p>
                {house.tenant.hasPets && (
                  <div className="mt-1 bg-red-50 border border-red-100 rounded-lg p-2 flex items-start gap-1.5 text-red-800">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-3xs uppercase">ละเมิดกฎ!</p>
                      <p className="text-4xs font-light text-red-700 leading-tight">พบเลี้ยงสัตว์เลี้ยงในบ้านสวน ซึ่งขัดกฎระเบียบอย่างร้ายแรง</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Selection */}
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full text-left font-medium text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-natural-primary text-white shadow-xs'
                  : 'text-natural-text/70 hover:bg-natural-primary/5 hover:text-natural-text'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calculator className="w-4 h-4" /> จดมิเตอร์ & คำนวณบิล
              </span>
              {hasPendingBill && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
            </button>

            <button
              onClick={() => setActiveTab('tenant')}
              className={`w-full text-left font-medium text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'tenant'
                  ? 'bg-natural-primary text-white shadow-xs'
                  : 'text-natural-text/70 hover:bg-natural-primary/5 hover:text-natural-text'
              }`}
            >
              <User className="w-4 h-4" /> สัญญาเช่า & ข้อมูลผู้เช่า
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full text-left font-medium text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-natural-primary text-white shadow-xs'
                  : 'text-natural-text/70 hover:bg-natural-primary/5 hover:text-natural-text'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> ประวัติการออกบิลเก่า
              </span>
              <span className="bg-natural-primary/10 text-natural-primary text-3xs font-semibold px-2 py-0.5 rounded-full font-mono">
                {houseBills.length}
              </span>
            </button>
          </div>
        </div>

        {/* Info footer */}
        <div className="text-3xs text-natural-text/40 pt-4 border-t border-natural-border/50">
          <p>โครงการบ้านสวน © 2026</p>
        </div>
      </div>

      {/* Right Content Panels */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        
        {/* Tab 1: Tenant Information Form */}
        {activeTab === 'tenant' && (
          <form onSubmit={handleSaveTenant} className="space-y-6">
            <div>
              <h3 className="font-serif font-bold text-natural-accent text-lg mb-1">จัดการข้อมูลผู้เช่ารายใหม่/ปัจจุบัน</h3>
              <p className="text-xs text-natural-text/60">ใส่ชื่อผู้เช่าเพื่อเริ่มต้นการคำนวณบิลและประวัติสัญญา</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">ชื่อ-นามสกุลผู้เช่า</label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full bg-natural-primary/[0.02] border border-natural-border rounded-xl py-2 px-3 text-xs text-natural-text focus:outline-none focus:border-natural-primary focus:bg-white transition-all"
                  placeholder="เช่น คุณสมชาย ใจดี (เว้นว่างไว้เพื่อระบุเป็นบ้านว่าง)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="w-full bg-natural-primary/[0.02] border border-natural-border rounded-xl py-2 px-3 text-xs text-natural-text focus:outline-none focus:border-natural-primary focus:bg-white font-mono transition-all"
                  placeholder="เช่น 081-234-5678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">วันเช่าเข้าอยู่วันแรก (Move-in Date)</label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full bg-natural-primary/[0.02] border border-natural-border rounded-xl py-2 px-3 text-xs text-natural-text focus:outline-none focus:border-natural-primary focus:bg-white font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">ระยะเวลาสัญญาขั้นต่ำ (เดือน)</label>
                <select
                  value={contractPeriod}
                  onChange={(e) => setContractPeriod(parseInt(e.target.value))}
                  className="w-full bg-natural-primary/[0.02] border border-natural-border rounded-xl py-2 px-3 text-xs text-natural-text focus:outline-none focus:border-natural-primary focus:bg-white font-mono transition-all"
                >
                  <option value={12}>12 เดือน (ขั้นต่ำตามกฎโครงการ)</option>
                  <option value={6}>6 เดือน (กรณีพิเศษ)</option>
                  <option value={24}>24 เดือน (สัญญาระยะยาว)</option>
                </select>
              </div>
            </div>

            {/* Pets strict check */}
            <div className="bg-orange-50/40 border border-orange-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <input
                  id="pet_prohibition"
                  type="checkbox"
                  checked={hasPets}
                  onChange={(e) => setHasPets(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-natural-border mt-1"
                />
                <div className="text-xs">
                  <label htmlFor="pet_prohibition" className="font-semibold text-natural-accent cursor-pointer block">
                    ตรวจสอบการนำสัตว์เลี้ยงมาเลี้ยง (Pet Check)
                  </label>
                  <p className="text-natural-text/60 font-light mt-0.5">
                    ** กฎระเบียบเคร่งครัดสูงสุด: ไม่อนุญาตให้ผู้เช่าเลี้ยงสัตว์เลี้ยงทุกชนิดโดยเด็ดขาด!
                  </p>
                  {hasPets && (
                    <div className="mt-2 text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 animate-pulse">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>พบการฝ่าฝืน: จะส่งประกาศตักเตือนอัตโนมัติ</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist of Room Amenities */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-natural-text/80">ตรวจสอบและยืนยันสิ่งอำนวยความสะดวกในบ้านสวน (6 รายการดั้งเดิม)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(amenities).map((key) => {
                  const thaiLabels: { [key: string]: string } = {
                    aircon: 'แอร์ (เครื่องปรับอากาศ)',
                    waterHeater: 'เครื่องทำน้ำอุ่น',
                    fridge: 'ตู้เย็น',
                    bed: 'เตียงพร้อมที่นอน 5 ฟุต',
                    dressingTable: 'โต๊ะเครื่องแป้ง',
                    wardrobe: 'ตู้เสื้อผ้า',
                  };
                  return (
                    <label key={key} className="flex items-center space-x-2 text-xs bg-natural-primary/[0.02] border border-natural-border p-3 rounded-xl hover:bg-natural-primary/[0.05] cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={(amenities as any)[key]}
                        onChange={(e) => setAmenities(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="w-4 h-4 text-natural-primary border-natural-border focus:ring-natural-primary rounded"
                      />
                      <span className="text-natural-text/80">{thaiLabels[key]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-between border-t border-natural-border pt-4">
              <span className="text-natural-text/40 text-3xs">กดบันทึกหลังจากแก้ไขข้อมูลเรียบร้อย</span>
              <button
                type="submit"
                className="bg-natural-primary hover:bg-natural-dark-hover text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
              >
                บันทึกข้อมูลผู้เช่า
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Billing & Utility calculations */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {!house.isOccupied ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-natural-text/50 space-y-3">
                <User className="w-12 h-12 text-natural-primary/30 stroke-[1.5]" />
                <div>
                  <h3 className="font-semibold text-natural-text/80 text-sm">บ้านหลังนี้ยังไม่มีผู้เช่าลงทะเบียน</h3>
                  <p className="text-xs text-natural-text/60 mt-1 max-w-sm">กรุณาลงทะเบียนข้อมูลผู้เช่ารายใหม่ก่อนในแท็บ "ข้อมูลผู้เช่า" เพื่อเริ่มจดมิเตอร์ค่าน้ำค่าไฟของเดือนนี้</p>
                </div>
                <button
                  onClick={() => setActiveTab('tenant')}
                  className="bg-natural-primary text-white text-xs px-4 py-2.5 rounded-xl hover:bg-natural-dark-hover font-bold shadow-md cursor-pointer"
                >
                  ลงทะเบียนผู้เช่าเดี๋ยวนี้
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-natural-accent text-lg">จดเลขอ่านมิเตอร์และคำนวณบิลรายเดือน</h3>
                    <span className="bg-natural-primary/5 border border-natural-border text-natural-accent text-2xs font-mono font-bold px-3 py-1 rounded-xl">
                      รอบบิล: {selectedMonth}
                    </span>
                  </div>
                  <p className="text-xs text-natural-text/60 mt-1">ตรรกะการคำนวณจะตรวจสอบ "เกณฑ์ค่ารักษามิเตอร์ขั้นต่ำ" ทันทีหากใช้น้ำไฟน้อยกว่ากำหนด</p>
                </div>

                <form onSubmit={handleCalculate} className="space-y-5 bg-natural-primary/[0.01] border border-natural-border p-5 rounded-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Electricity Input */}
                    <div className="bg-white rounded-xl p-4 border border-orange-100/60 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between text-orange-800 text-xs font-semibold">
                        <span className="flex items-center gap-1 font-serif">⚡️ เลขมิเตอร์ไฟฟ้า</span>
                        <span className="text-4xs font-normal text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">เรทปัจจุบัน {currentRates.electricityRate} บ./หน่วย</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-4xs font-medium text-natural-text/50 mb-1">เลขก่อนหน้า (ครั้งก่อน)</label>
                          <input
                            type="number"
                            value={prevElec}
                            onChange={(e) => setPrevElec(e.target.value)}
                            className="w-full bg-natural-primary/[0.01] border border-natural-border rounded-lg py-1.5 px-2.5 text-xs text-natural-text font-mono font-bold focus:outline-none focus:border-orange-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-4xs font-medium text-natural-text/50 mb-1">เลขมิเตอร์ปัจจุบัน (ครั้งนี้)</label>
                          <input
                            type="number"
                            value={currElec}
                            onChange={(e) => setCurrElec(e.target.value)}
                            className="w-full bg-natural-primary/[0.02] border border-orange-300 rounded-lg py-1.5 px-2.5 text-xs text-natural-text font-mono font-bold focus:outline-none focus:border-orange-500"
                            placeholder="ตัวเลขล่าสุด"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Water Input */}
                    <div className="bg-white rounded-xl p-4 border border-sky-100/60 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between text-sky-800 text-xs font-semibold">
                        <span className="flex items-center gap-1 font-serif">💧 เลขมิเตอร์น้ำประปา</span>
                        <span className="text-4xs font-normal text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">เรทปัจจุบัน {currentRates.waterRate} บ./หน่วย</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-4xs font-medium text-natural-text/50 mb-1">เลขก่อนหน้า (ครั้งก่อน)</label>
                          <input
                            type="number"
                            value={prevWater}
                            onChange={(e) => setPrevWater(e.target.value)}
                            className="w-full bg-natural-primary/[0.01] border border-natural-border rounded-lg py-1.5 px-2.5 text-xs text-natural-text font-mono font-bold focus:outline-none focus:border-sky-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-4xs font-medium text-natural-text/50 mb-1">เลขมิเตอร์ปัจจุบัน (ครั้งนี้)</label>
                          <input
                            type="number"
                            value={currWater}
                            onChange={(e) => setCurrWater(e.target.value)}
                            className="w-full bg-natural-primary/[0.02] border border-sky-300 rounded-lg py-1.5 px-2.5 text-xs text-natural-text font-mono font-bold focus:outline-none focus:border-sky-500"
                            placeholder="ตัวเลขล่าสุด"
                            required
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Late payment logic */}
                  <div className="bg-white rounded-xl p-4 border border-natural-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <input
                        id="late_payment"
                        type="checkbox"
                        checked={isLate}
                        onChange={(e) => setIsLate(e.target.checked)}
                        className="w-4 h-4 rounded text-natural-primary border-natural-border focus:ring-natural-primary mt-0.5"
                      />
                      <div className="text-xs">
                        <label htmlFor="late_payment" className="font-semibold text-natural-accent cursor-pointer">
                          มีประวัติจ่ายล่าช้าในรอบนี้ (Late Payment)
                        </label>
                        <p className="text-natural-text/50 font-light text-4xs">เริ่มนับค่าปรับตั้งแต่วันถัดจากวันกำหนดชำระ โดยระบบจะคิดค่าปรับวันละ {currentRates.lateFeePerDay} บาท</p>
                      </div>
                    </div>

                    {isLate && (
                      <div className="flex items-center space-x-2 animate-fade-in">
                        <label className="text-4xs text-natural-text/50 font-medium whitespace-nowrap">จำนวนวันล่าช้า:</label>
                        <div className="relative w-28">
                          <input
                            type="number"
                            min="1"
                            value={lateDays}
                            onChange={(e) => setLateDays(e.target.value)}
                            className="w-full bg-natural-primary/[0.02] border border-natural-border rounded-lg py-1 px-2.5 pr-8 text-xs text-natural-text font-mono font-bold focus:outline-none focus:border-natural-primary"
                            required
                          />
                          <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-4xs text-natural-text/40 font-medium">วัน</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-natural-primary hover:bg-natural-dark-hover text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Calculator className="w-4 h-4" /> ประมวลผลและคำนวณบิล
                    </button>
                  </div>
                </form>

                {/* Computation results preview */}
                {computedBill && (
                  <div className="border border-natural-border bg-white rounded-[32px] p-6 shadow-sm animate-fade-in space-y-5">
                    <div className="flex items-center justify-between border-b border-natural-border pb-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4.5 h-4.5 text-natural-primary" />
                        <span className="font-serif font-bold text-natural-accent text-sm">รายละเอียดใบแจ้งยอดค่าใช้จ่าย (House No. {house.id})</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-wide border ${
                        computedBill.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        {computedBill.status === 'paid' ? 'ชำระแล้ว' : 'รอการชำระ'}
                      </span>
                    </div>

                    <div className="space-y-3 font-sans text-sm">
                      
                      {/* Rent */}
                      <div className="flex justify-between border-b border-dashed border-natural-border pb-2.5">
                        <span className="text-natural-text/70">ค่าเช่าบ้านรายเดือนคงที่</span>
                        <span className="font-bold text-natural-accent">{(computedBill.rentCharge || 0).toLocaleString()}.00</span>
                      </div>

                      {/* Electricity Detail */}
                      <div className="flex justify-between border-b border-dashed border-natural-border pb-2.5">
                        <div>
                          <span className="text-natural-text/70 block">ค่าไฟฟ้า ({computedBill.elecUnits} หน่วย)</span>
                          <span className="text-[10px] text-natural-text/40 block mt-0.5">* อัตราหน่วยละ {computedBill.ratesSnapshot?.electricityRate} บาท (ขั้นต่ำ {computedBill.ratesSnapshot?.electricityMinCharge} บ.)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-natural-accent">{(computedBill.elecFinalCharge || 0).toLocaleString()}.00</span>
                          {computedBill.elecMinApplied && (
                            <span className="block text-[10px] text-orange-600 font-semibold">* ปรับเป็นขั้นต่ำ</span>
                          )}
                        </div>
                      </div>

                      {/* Water Detail */}
                      <div className="flex justify-between border-b border-dashed border-natural-border pb-2.5">
                        <div>
                          <span className="text-natural-text/70 block">ค่าน้ำประปา ({computedBill.waterUnits} หน่วย)</span>
                          <span className="text-[10px] text-natural-text/40 block mt-0.5">* อัตราหน่วยละ {computedBill.ratesSnapshot?.waterRate} บาท (ขั้นต่ำ {computedBill.ratesSnapshot?.waterMinCharge} บ.)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-natural-accent">{(computedBill.waterFinalCharge || 0).toLocaleString()}.00</span>
                          {computedBill.waterMinApplied && (
                            <span className="block text-[10px] text-orange-600 font-semibold">* ปรับเป็นขั้นต่ำ</span>
                          )}
                        </div>
                      </div>

                      {/* Late Fee */}
                      <div className="flex justify-between pb-2.5">
                        <div>
                          <span className="text-natural-text/70 block">ค่าปรับชำระล่าช้า ({computedBill.lateDays || 0} วัน)</span>
                          <span className="text-[10px] text-natural-text/40 block mt-0.5">* คิดค่าปรับอัตราวันละ {computedBill.ratesSnapshot?.lateFeePerDay} บาท</span>
                        </div>
                        <span className="font-bold text-natural-accent">{(computedBill.lateCharge || 0).toLocaleString()}.00</span>
                      </div>

                    </div>

                    {/* Highlighted Total exactly like theme */}
                    <div className="pt-5 border-t-2 border-natural-primary">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                          <span className="text-xs font-bold text-natural-primary uppercase tracking-wide block">ยอดรวมรวมสุทธิที่ต้องเรียกชำระ</span>
                          <span className="text-3xl font-serif font-black text-natural-primary block mt-1">
                            ฿ {(computedBill.grandTotal || 0).toLocaleString()}.00
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => handleCopyInvoice(computedBill as Bill)}
                            className="bg-natural-primary/10 hover:bg-natural-primary/20 text-natural-primary text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all font-semibold cursor-pointer"
                            title="คัดลอกใบแจ้งหนี้เข้า LINE"
                          >
                            {copiedBillId === computedBill.id ? <Check className="w-4 h-4 text-emerald-600 font-bold" /> : <Clipboard className="w-4 h-4" />}
                            <span>{copiedBillId === computedBill.id ? 'คัดลอกสำเร็จ' : 'คัดลอกใบแจ้งหนี้'}</span>
                          </button>

                          <button
                            onClick={() => handleExportPDF(computedBill as Bill)}
                            className="bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all font-semibold cursor-pointer border border-sky-200"
                            title="พิมพ์หรือส่งออกไฟล์ PDF"
                          >
                            <FileText className="w-4 h-4 text-sky-600" />
                            <span>พิมพ์ / ส่งออก PDF</span>
                          </button>

                          <button
                            onClick={handleFinalizeBill}
                            className="bg-natural-primary hover:bg-natural-dark-hover text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                          >
                            <Save className="w-4 h-4" />
                            <span>บันทึก & สรุปบิล</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Historical Billing Snapshots */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif font-bold text-natural-accent text-lg">ประวัติการคำนวณบิลย้อนหลัง (Billing Snapshot History)</h3>
              <p className="text-xs text-natural-text/60 mt-1">แสดงประวัติที่เคยออกบิล โดยแต่ละบิลจะทำการฝัง "Snapshot อัตราค่าบริการ ณ เดือนนั้นๆ" ไว้เสมอ</p>
            </div>

            {houseBills.length === 0 ? (
              <div className="text-center py-12 text-natural-text/50 border border-dashed border-natural-border rounded-2xl">
                <FileText className="w-10 h-10 text-natural-primary/30 mx-auto stroke-[1.5] mb-2" />
                <p className="text-xs text-natural-text/60 font-light">ยังไม่เคยมีบันทึกประวัติบิลสำหรับบ้านหลังนี้</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {houseBills.map((billItem) => {
                  const isCopied = copiedBillId === billItem.id;
                  return (
                    <div key={billItem.id} className="bg-natural-primary/[0.01] border border-natural-border rounded-xl p-4 space-y-3 relative hover:shadow-2xs transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-natural-border/60 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <strong className="text-xs text-natural-accent font-mono font-bold">รอบบิล: {billItem.billingMonth}</strong>
                          <span className="text-4xs text-natural-text/40">({new Date(billItem.createdAt).toLocaleDateString('th-TH')})</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTogglePaid(billItem.id, billItem.status)}
                            className={`px-2.5 py-1 rounded-lg text-4xs font-bold cursor-pointer border transition-colors ${
                              billItem.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                : 'bg-orange-50 text-orange-800 border-orange-100'
                            }`}
                          >
                            {billItem.status === 'paid' ? '✅ ชำระแล้ว (คลิกยกเลิก)' : '⏳ รอชำระ (คลิกยืนยัน)'}
                          </button>

                          <button
                            onClick={() => handleCopyInvoice(billItem)}
                            className="bg-white border border-natural-border hover:bg-natural-primary/5 p-1.5 rounded-lg text-natural-primary transition-colors cursor-pointer"
                            title="คัดลอกใบแจ้งหนี้เข้า LINE"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <Clipboard className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleExportPDF(billItem)}
                            className="bg-white border border-sky-100 hover:bg-sky-50 p-1.5 rounded-lg text-sky-600 transition-colors cursor-pointer"
                            title="พิมพ์หรือดาวน์โหลด PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteBill(billItem.id)}
                            className="bg-white border border-red-100 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="ลบข้อมูลบิลนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Detail overview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-4xs text-natural-text/60 leading-tight">
                        <div>
                          <p className="font-semibold text-natural-accent">ค่าเช่าหลัก:</p>
                          <p className="font-mono mt-0.5">{billItem.rentCharge.toLocaleString()} บาท</p>
                        </div>
                        <div>
                          <p className="font-semibold text-natural-accent">ค่าไฟ (เรท {billItem.ratesSnapshot.electricityRate} บ.):</p>
                          <p className="font-mono mt-0.5">
                            {billItem.elecFinalCharge.toLocaleString()} บาท ({billItem.elecUnits} หน่วย)
                            {billItem.elecMinApplied && <span className="block text-red-600 text-5xs font-bold"> (เหมาขั้นต่ำ)</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-natural-accent">ค่าน้ำ (เรท {billItem.ratesSnapshot.waterRate} บ.):</p>
                          <p className="font-mono mt-0.5">
                            {billItem.waterFinalCharge.toLocaleString()} บาท ({billItem.waterUnits} หน่วย)
                            {billItem.waterMinApplied && <span className="block text-red-600 text-5xs font-bold"> (เหมาขั้นต่ำ)</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-natural-accent">ค่าปรับ (ล่าช้า {billItem.lateDays} วัน):</p>
                          <p className="font-mono mt-0.5">{billItem.lateCharge.toLocaleString()} บาท</p>
                        </div>
                      </div>

                      <div className="bg-natural-primary/5 p-2 rounded-lg flex justify-between items-center text-xs font-mono font-bold text-natural-accent">
                        <span>รวมสุทธิ:</span>
                        <span>{billItem.grandTotal.toLocaleString()} บาท</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Visual Confirmation Banner (Shared across forms) */}
        {isSavedNotify && (
          <div className="mt-4 bg-emerald-50 border border-emerald-150 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800 animate-fade-in shadow-2xs">
            <div className="flex items-center space-x-2 font-medium">
              <ShieldCheck className="w-5 h-5 text-emerald-600 animate-bounce" />
              <span>บันทึกการดำเนินการเรียบร้อยแล้ว! ข้อมูลได้รับการอัปเดตลงระบบเรียบร้อย</span>
            </div>
          </div>
        )}

        {/* Dynamic Print Preview Overlay (Allows full printing inside sandboxed iframe) */}
        {printBill && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto no-print">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col my-4 sm:my-8 border border-slate-200 animate-fade-in no-print">
              {/* Action Header bar (Always hidden when printing) */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl no-print">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">พิมพ์หรือบันทึกใบแจ้งหนี้</h3>
                    <p className="text-[10px] text-slate-400">ระบบ Print Preview จะซ่อนปุ่มแถบควบคุมนี้ออกโดยอัตโนมัติ</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-600/10 active:scale-95"
                  >
                    <FileText className="w-4 h-4" />
                    <span>สั่งพิมพ์ / โหลด PDF</span>
                  </button>
                  <button
                    onClick={() => setPrintBill(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    ปิด
                  </button>
                </div>
              </div>
              
              {/* Scrollable container on screen */}
              <div className="p-4 sm:p-8 max-h-[75vh] overflow-y-auto bg-slate-50/50 rounded-b-2xl no-print">
                <div id="print-area" className="bg-white text-slate-800 p-6 sm:p-10 mx-auto shadow-sm max-w-[700px] rounded-xl border border-slate-200/60">
                  {/* Company Logo and Document Meta */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-natural-primary pb-6 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-natural-primary rounded-full flex items-center justify-center text-white text-xs font-bold font-mono">BS</div>
                        <h2 className="text-xl font-bold text-natural-accent font-serif">โครงการบ้านสวน</h2>
                      </div>
                      <p className="text-3xs text-slate-500 mt-2 leading-relaxed">
                        ห้องพักและบ้านเช่ารายเดือนสไตล์ธรรมชาติ ร่มรื่น และอบอุ่น<br />
                        โทร: 081-123-4567 | อีเมล: baansuan@project.com
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <h1 className="text-lg font-bold text-natural-accent">ใบแจ้งหนี้ / ใบเสร็จรับเงิน</h1>
                      <div className="text-3xs text-slate-500 mt-2 space-y-1">
                        <div><strong className="text-slate-700">เลขที่เอกสาร:</strong> <span className="font-mono text-slate-900">INV-{printBill.id}</span></div>
                        <div><strong className="text-slate-700">วันที่ออก:</strong> {new Date(printBill.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div><strong className="text-slate-700">รอบบิลประจำเดือน:</strong> <span className="font-semibold text-slate-900">
                          {(() => {
                            const [year, month] = printBill.billingMonth.split('-');
                            const monthNamesThai = [
                              'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                              'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                            ];
                            return `${monthNamesThai[parseInt(month, 10) - 1]} ${parseInt(year, 10) + 543}`;
                          })()}
                        </span></div>
                      </div>
                    </div>
                  </div>

                  {/* Customer / Lease Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <span className="text-4xs font-bold text-slate-400 block uppercase tracking-wider mb-2">ข้อมูลผู้เช่า / ผู้รับบริการ</span>
                      <div className="space-y-1 text-xs text-slate-700">
                        <p><span className="text-slate-400">ชื่อผู้เช่า:</span> <strong>คุณ {house.tenant?.name || '-'}</strong></p>
                        <p><span className="text-slate-400">บ้านเช่าเลขที่:</span> <strong>{house.name}</strong></p>
                        <p><span className="text-slate-400">เบอร์โทรศัพท์:</span> <span className="font-mono font-medium">{house.tenant?.phone || '-'}</span></p>
                      </div>
                    </div>
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <span className="text-4xs font-bold text-slate-400 block uppercase tracking-wider mb-2">สถานะการชำระเงิน</span>
                      <div className="space-y-1 text-xs text-slate-700">
                        <p>
                          <span className="text-slate-400">สถานะ:</span>{' '}
                          {printBill.status === 'paid' ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md font-bold text-[10px]">ชำระเงินเรียบร้อยแล้ว</span>
                          ) : (
                            <span className="bg-orange-50 text-orange-800 border border-orange-100 px-2 py-0.5 rounded-md font-bold text-[10px]">รอการชำระเงิน</span>
                          )}
                        </p>
                        <p><span className="text-slate-400">กำหนดชำระ:</span> ภายในวันที่ 5 ของเดือนถัดไป</p>
                        {printBill.paymentDate && (
                          <p><span className="text-slate-400">วันที่ชำระเงิน:</span> <span className="font-medium text-emerald-700">{new Date(printBill.paymentDate).toLocaleDateString('th-TH')}</span></p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Table of Charges */}
                  <div className="border border-slate-150 rounded-xl overflow-hidden mb-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-150 text-natural-accent font-bold text-[11px]">
                          <th className="p-3">รายการรายละเอียด</th>
                          <th className="p-3 text-right">หน่วยที่ใช้</th>
                          <th className="p-3 text-right">ราคาต่อหน่วย</th>
                          <th className="p-3 text-right">รวมเงิน (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {/* 1. Base Rent */}
                        <tr>
                          <td className="p-3 text-slate-700 font-medium">ค่าเช่าบ้านพักรายเดือนคงที่</td>
                          <td className="p-3 text-right text-slate-400 font-mono">-</td>
                          <td className="p-3 text-right text-slate-400 font-mono">-</td>
                          <td className="p-3 text-right text-slate-800 font-mono font-semibold">{printBill.rentCharge.toLocaleString()}.00</td>
                        </tr>
                        {/* 2. Electricity */}
                        <tr>
                          <td className="p-3 text-slate-700">
                            <span className="font-medium block">ค่าไฟฟ้าประจำรอบเดือน</span>
                            <span className="text-[10px] text-slate-400 leading-none">
                              (เลขอ่านครั้งก่อน: {printBill.prevElecReading} - เลขอ่านปัจจุบัน: {printBill.currElecReading})
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-800 font-mono">{printBill.elecUnits}</td>
                          <td className="p-3 text-right text-slate-800 font-mono">{printBill.ratesSnapshot.electricityRate}</td>
                          <td className="p-3 text-right text-slate-800 font-mono font-semibold">
                            <div>{printBill.elecFinalCharge.toLocaleString()}.00</div>
                            {printBill.elecMinApplied && (
                              <div className="text-[9px] text-orange-600 font-semibold">*คิดอัตราเหมาขั้นต่ำ ({printBill.ratesSnapshot.electricityMinCharge} บ.)</div>
                            )}
                          </td>
                        </tr>
                        {/* 3. Water */}
                        <tr>
                          <td className="p-3 text-slate-700">
                            <span className="font-medium block">ค่าน้ำประปาประจำรอบเดือน</span>
                            <span className="text-[10px] text-slate-400 leading-none">
                              (เลขอ่านครั้งก่อน: {printBill.prevWaterReading} - เลขอ่านปัจจุบัน: {printBill.currWaterReading})
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-800 font-mono">{printBill.waterUnits}</td>
                          <td className="p-3 text-right text-slate-800 font-mono">{printBill.ratesSnapshot.waterRate}</td>
                          <td className="p-3 text-right text-slate-800 font-mono font-semibold">
                            <div>{printBill.waterFinalCharge.toLocaleString()}.00</div>
                            {printBill.waterMinApplied && (
                              <div className="text-[9px] text-orange-600 font-semibold">*คิดอัตราเหมาขั้นต่ำ ({printBill.ratesSnapshot.waterMinCharge} บ.)</div>
                            )}
                          </td>
                        </tr>
                        {/* 4. Late Fees */}
                        {printBill.lateCharge > 0 && (
                          <tr>
                            <td className="p-3 text-slate-700">
                              <span className="font-medium block text-orange-700">ค่าปรับชำระล่าช้า (Late Charge)</span>
                              <span className="text-[10px] text-slate-400 leading-none">
                                (จำนวนวันเกินกำหนด {printBill.lateDays} วัน อัตราวันละ {printBill.ratesSnapshot.lateFeePerDay} บาท)
                              </span>
                            </td>
                            <td className="p-3 text-right text-orange-700 font-mono">{printBill.lateDays}</td>
                            <td className="p-3 text-right text-orange-700 font-mono">{printBill.ratesSnapshot.lateFeePerDay}</td>
                            <td className="p-3 text-right text-orange-700 font-mono font-semibold">{printBill.lateCharge.toLocaleString()}.00</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals */}
                  <div className="flex justify-end mb-6">
                    <div className="w-full sm:w-80 border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <div className="flex justify-between p-3 border-b border-slate-100 text-slate-600">
                        <span>ยอดรวมสุทธิ (Grand Total)</span>
                        <span className="font-mono font-semibold">฿{printBill.grandTotal.toLocaleString()}.00</span>
                      </div>
                      <div className="flex justify-between p-3 bg-natural-primary/5 text-natural-accent font-bold text-sm">
                        <span>ยอดที่ต้องชำระทั้งสิ้น</span>
                        <span className="font-mono text-base">฿{printBill.grandTotal.toLocaleString()}.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Bank Transfer Details */}
                  <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 mb-6 text-xs text-slate-700">
                    <h4 className="font-bold text-natural-accent mb-1.5 flex items-center gap-1.5">
                      <span>🏦</span> ช่องทางการชำระเงิน (Payment Channel)
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">กรุณาโอนเงินผ่านบัญชีธนาคารด้านล่างนี้ และส่งหลักฐานสลิปโอนเงินให้ผู้ดูแลโครงการเพื่อยืนยัน</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-200/50 pt-3 text-[11px]">
                      <div><strong className="text-slate-500">ธนาคาร:</strong> ธนาคารกสิกรไทย (KBANK)</div>
                      <div><strong className="text-slate-500">เลขที่บัญชี:</strong> 012-3-45678-9</div>
                      <div><strong className="text-slate-500">ชื่อบัญชี:</strong> โครงการบ้านสวน (Baan Suan)</div>
                    </div>
                  </div>

                  {/* Thank You Note */}
                  <div className="text-center text-slate-400 text-4xs border-t border-slate-150 pt-5 leading-relaxed">
                    <p className="text-slate-500 font-semibold text-3xs">ขอขอบพระคุณที่ใช้บริการโครงการบ้านสวนของเราค่ะ 🙏</p>
                    <p className="mt-1">ใบแจ้งหนี้ฉบับนี้พิมพ์โดยระบบบริหารจัดการโครงการบ้านสวนอัตโนมัติ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
