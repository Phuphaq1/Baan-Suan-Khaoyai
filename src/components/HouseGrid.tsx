import React from 'react';
import { House, Bill } from '../types';
import { Home, User, CreditCard, CheckCircle2, AlertTriangle, CalendarCheck } from 'lucide-react';

interface HouseGridProps {
  houses: House[];
  bills: Bill[];
  selectedMonth: string;
  onSelectHouse: (id: number) => void;
  selectedHouseId: number | null;
}

export default function HouseGrid({ houses, bills, selectedMonth, onSelectHouse, selectedHouseId }: HouseGridProps) {
  // Get active bills for the selected month to show status on grid
  const getHouseBillStatus = (houseId: number) => {
    const bill = bills.find(b => b.houseId === houseId && b.billingMonth === selectedMonth);
    return bill;
  };

  return (
    <div id="house_grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-sans">
      {houses.map((house) => {
        const bill = getHouseBillStatus(house.id);
        const isSelected = selectedHouseId === house.id;

        // Determine status badges and card highlights
        let billStatusText = 'ยังไม่ได้คำนวณบิล';
        let billStatusClass = 'bg-natural-primary/5 text-natural-text/60 border border-natural-border';
        let billStatusIcon = <CreditCard className="w-3.5 h-3.5" />;

        if (bill) {
          if (bill.status === 'paid') {
            billStatusText = 'ชำระเงินแล้ว';
            billStatusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            billStatusIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
          } else {
            billStatusText = `ค้างชำระ: ${bill.grandTotal.toLocaleString()} บ.`;
            billStatusClass = 'bg-orange-50 text-orange-700 border border-orange-200 font-medium';
            billStatusIcon = <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />;
          }
        }

        return (
          <button
            key={house.id}
            onClick={() => onSelectHouse(house.id)}
            className={`text-left rounded-2xl p-5 border transition-all duration-300 relative group flex flex-col justify-between h-[175px] ${
              isSelected
                ? 'bg-natural-primary/5 text-natural-accent border-2 border-natural-primary shadow-md ring-2 ring-natural-primary/5 font-bold'
                : 'bg-white hover:bg-natural-primary/[0.02] border-natural-border shadow-xs hover:shadow-md text-natural-text'
            }`}
          >
            {/* Top section with House Name & Occupancy */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className={`font-serif text-sm font-bold ${isSelected ? 'text-natural-accent font-black' : 'text-natural-text'}`}>
                  {house.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-3xs font-medium border ${
                    house.isOccupied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-natural-primary/5 text-natural-text/50 border-natural-border'
                  }`}
                >
                  {house.isOccupied ? 'มีผู้เช่า' : 'ว่าง'}
                </span>
              </div>

              {/* Tenant Summary */}
              {house.isOccupied && house.tenant ? (
                <div className="space-y-1 mt-3">
                  <div className="flex items-center space-x-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-natural-primary/60" />
                    <span className="truncate font-medium max-w-[120px] text-natural-text">
                      {house.tenant.name}
                    </span>
                  </div>
                  <span className="text-3xs block pl-5 text-natural-text/50 font-mono">
                    สัญญาสิ้นสุด: {house.tenant.moveInDate ? (() => {
                      const d = new Date(house.tenant.moveInDate);
                      d.setMonth(d.getMonth() + house.tenant.contractPeriod);
                      return d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
                    })() : '-'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-xs text-natural-text/40 italic mt-3.5">
                  <Home className="w-3.5 h-3.5" />
                  <span>พร้อมเข้าอยู่</span>
                </div>
              )}
            </div>

            {/* Bottom section with Billing Status Badge */}
            <div className="w-full mt-4">
              {house.isOccupied ? (
                <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-3xs ${
                  isSelected && bill ? (bill.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-50 text-orange-700 border border-orange-200') : billStatusClass
                }`}>
                  {billStatusIcon}
                  <span className="truncate">
                    {isSelected && bill 
                      ? `${bill.status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'} (${bill.grandTotal.toLocaleString()} บ.)` 
                      : billStatusText}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-3xs border bg-natural-primary/[0.02] text-natural-text/40 border-natural-border/60">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>ไม่มีค่าใช้จ่าย</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
