import React, { useState } from 'react';
import { UtilityRates } from '../types';
import { Settings, Zap, Droplet, DollarSign, Calendar, ShieldCheck, HelpCircle } from 'lucide-react';

interface RatesSettingsProps {
  currentRates: UtilityRates;
  onSaveRates: (rates: UtilityRates) => void;
}

export default function RatesSettings({ currentRates, onSaveRates }: RatesSettingsProps) {
  const [rates, setRates] = useState<UtilityRates>({ ...currentRates });
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (key: keyof UtilityRates, val: string) => {
    const numericVal = parseFloat(val) || 0;
    setRates(prev => ({
      ...prev,
      [key]: numericVal
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRates(rates);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetToDefault = () => {
    const defaults: UtilityRates = {
      electricityRate: 7,
      electricityMinCharge: 100,
      waterRate: 18,
      waterMinCharge: 50,
      lateFeePerDay: 50,
      rentRate: 4500
    };
    setRates(defaults);
    onSaveRates(defaults);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div id="rates_settings_panel" className="bg-white rounded-2xl shadow-sm border border-natural-border p-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-natural-border pb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-natural-primary/10 p-2.5 rounded-xl text-natural-primary shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-natural-accent">ตั้งค่าอัตราค่าบริการและข้อมูลพื้นฐาน</h2>
            <p className="text-xs text-natural-text/60">กำหนดอัตราค่าสาธารณูปโภค ค่าปรับ และค่าเช่าสำหรับใช้เป็นหลักในการคำนวณบิล</p>
          </div>
        </div>
        <button
          onClick={handleResetToDefault}
          type="button"
          className="text-xs font-semibold text-natural-text/60 hover:text-natural-accent border border-natural-border hover:bg-natural-primary/5 px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
        >
          รีเซ็ตเป็นค่าเริ่มต้น
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Electricity Settings */}
          <div className="bg-orange-50/40 rounded-2xl border border-orange-100 p-5 space-y-4">
            <div className="flex items-center space-x-2 text-orange-800 font-semibold text-sm">
              <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="font-serif">ค่าไฟฟ้า (Electricity)</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">อัตราค่าไฟ (บาท / หน่วย)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={rates.electricityRate || ''}
                    onChange={(e) => handleChange('electricityRate', e.target.value)}
                    className="w-full bg-white border border-natural-border rounded-xl py-2 px-3 pl-3 pr-12 text-sm text-natural-text focus:outline-none focus:border-natural-primary focus:ring-1 focus:ring-natural-primary font-mono font-bold"
                    placeholder="7"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-natural-text/50 font-semibold">
                    บาท/หน่วย
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">ค่าไฟขั้นต่ำ (บาท / เดือน)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={rates.electricityMinCharge || ''}
                    onChange={(e) => handleChange('electricityMinCharge', e.target.value)}
                    className="w-full bg-white border border-natural-border rounded-xl py-2 px-3 pl-3 pr-12 text-sm text-natural-text focus:outline-none focus:border-natural-primary focus:ring-1 focus:ring-natural-primary font-mono font-bold"
                    placeholder="100"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-natural-text/50 font-semibold">
                    บาท/เดือน
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Water Settings */}
          <div className="bg-sky-50/40 rounded-2xl border border-sky-100 p-5 space-y-4">
            <div className="flex items-center space-x-2 text-sky-800 font-semibold text-sm">
              <Droplet className="w-4 h-4 text-sky-500 fill-sky-500" />
              <span className="font-serif">ค่าน้ำประปา (Water Supply)</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">อัตราค่าน้ำ (บาท / หน่วย)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={rates.waterRate || ''}
                    onChange={(e) => handleChange('waterRate', e.target.value)}
                    className="w-full bg-white border border-natural-border rounded-xl py-2 px-3 pl-3 pr-12 text-sm text-natural-text focus:outline-none focus:border-natural-primary focus:ring-1 focus:ring-natural-primary font-mono font-bold"
                    placeholder="18"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-natural-text/50 font-semibold">
                    บาท/หน่วย
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">ค่าน้ำขั้นต่ำ (บาท / เดือน)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={rates.waterMinCharge || ''}
                    onChange={(e) => handleChange('waterMinCharge', e.target.value)}
                    className="w-full bg-white border border-natural-border rounded-xl py-2 px-3 pl-3 pr-12 text-sm text-natural-text focus:outline-none focus:border-natural-primary focus:ring-1 focus:ring-natural-primary font-mono font-bold"
                    placeholder="50"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-natural-text/50 font-semibold">
                    บาท/เดือน
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Core Rent & Penalty Settings */}
          <div className="bg-natural-primary/[0.03] rounded-2xl border border-natural-border p-5 space-y-4">
            <div className="flex items-center space-x-2 text-natural-primary font-semibold text-sm">
              <DollarSign className="w-4 h-4 text-natural-primary" />
              <span className="font-serif">ค่าเช่าและค่าปรับ (Rent & Penalty)</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">ค่าเช่าหลัก (บาท / เดือน / หลัง)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={rates.rentRate || ''}
                    onChange={(e) => handleChange('rentRate', e.target.value)}
                    className="w-full bg-white border border-natural-border rounded-xl py-2 px-3 pl-3 pr-12 text-sm text-natural-text focus:outline-none focus:border-natural-primary focus:ring-1 focus:ring-natural-primary font-mono font-bold"
                    placeholder="4500"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-natural-text/50 font-semibold">
                    บาท/เดือน
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-natural-text/70 mb-1">ค่าปรับชำระล่าช้า (บาท / วัน)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={rates.lateFeePerDay || ''}
                    onChange={(e) => handleChange('lateFeePerDay', e.target.value)}
                    className="w-full bg-white border border-natural-border rounded-xl py-2 px-3 pl-3 pr-12 text-sm text-natural-text focus:outline-none focus:border-natural-primary focus:ring-1 focus:ring-natural-primary font-mono font-bold"
                    placeholder="50"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-natural-text/50 font-semibold">
                    บาท/วัน
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-natural-border pt-4">
          <div className="flex items-center space-x-2">
            {isSaved && (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-150 px-3.5 py-2 rounded-xl animate-pulse font-medium shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>บันทึกตั้งค่าอัตราการคำนวณเรียบร้อยลงระบบแล้ว!</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-natural-primary hover:bg-natural-dark-hover active:bg-natural-accent text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer self-end"
          >
            บันทึกการตั้งค่าระบบ
          </button>
        </div>
      </form>

      {/* Rules Notice Board */}
      <div className="mt-8 bg-natural-primary/[0.01] rounded-2xl border border-natural-border p-6">
        <h3 className="font-serif font-bold text-natural-accent text-sm mb-3 flex items-center gap-1.5">
          <HelpCircle className="w-4.5 h-4.5 text-natural-primary" />
          กฎระเบียบของโครงการ "บ้านสวน" (Master Data Rules)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-natural-text/70 leading-relaxed font-sans">
          <div className="space-y-2 bg-white p-4 rounded-xl border border-natural-border/60">
            <p className="font-serif font-bold text-natural-accent flex items-center gap-1">
              🏠 สัญญาเช่า & ค่าใช้จ่ายแรกเข้า
            </p>
            <ul className="list-disc list-inside space-y-1 text-natural-text/65 font-light pl-1">
              <li>ระยะเวลาการทำสัญญาเช่าขั้นต่ำคือ <strong className="text-natural-accent font-semibold">12 เดือน</strong> (ไม่สามารถลดสัญญาได้ต่ำกว่า 6 เดือน)</li>
              <li>ค่าใช้จ่ายจริงวันเข้าอยู่อย่างน้อย <strong className="text-natural-accent font-semibold">9,000 บาท</strong> (แบ่งเป็น เงินประกันความเสียหาย {rates.rentRate.toLocaleString()} บาท และค่าเช่าล่วงหน้าเดือนแรก {rates.rentRate.toLocaleString()} บาท)</li>
            </ul>
          </div>

          <div className="space-y-2 bg-white p-4 rounded-xl border border-natural-border/60">
            <p className="font-serif font-bold text-red-800 flex items-center gap-1">
              🚫 กฎระเบียบและสิ่งอำนวยความสะดวก
            </p>
            <ul className="list-disc list-inside space-y-1 text-natural-text/65 font-light pl-1">
              <li><strong className="text-red-700 font-semibold">ห้ามเลี้ยงสัตว์เลี้ยงทุกชนิดโดยเด็ดขาด</strong> เพื่อสุขลักษณะและความเรียบร้อยของโครงการ</li>
              <li>สิ่งอำนวยความสะดวกในบ้านสวนครบครัน 6 รายการ ได้แก่: แอร์, เครื่องทำน้ำอุ่น, ตู้เย็น, เตียงพร้อมที่นอน 5 ฟุต, โต๊ะเครื่องแป้ง, ตู้เสื้อผ้า</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
