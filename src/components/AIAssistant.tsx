import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, AlertCircle, RefreshCw, Clipboard, Check } from 'lucide-react';
import { ChatMessage, House, Bill } from '../types';

interface AIAssistantProps {
  houses: House[];
  bills: Bill[];
  selectedMonth: string;
  onSendFeedback?: (msg: string) => void;
}

export default function AIAssistant({ houses, bills, selectedMonth }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'สวัสดีค่ะ! ดิฉัน "คุณบ้านสวน" ผู้ช่วยผู้จัดการบ้านพักโครงการบ้านสวน ยินดีต้อนรับค่ะ\n\nวันนี้มีอะไรให้ช่วยไหมคะ? ดิฉันสามารถช่วยคำนวณบิลค่าน้ำค่าไฟ สรุปรายได้ เขียนข้อความทวงค่าเช่าอย่างสุภาพ หรือช่วยชี้แจงกฎเกณฑ์ "ห้ามเลี้ยงสัตว์เลี้ยงเด็ดขาด" และรายละเอียดสัญญาเช่าให้ได้ทันทีค่ะ!',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getProjectContext = () => {
    const occupiedCount = houses.filter(h => h.isOccupied).length;
    const billsForMonth = bills.filter(b => b.billingMonth === selectedMonth);
    const pendingBills = billsForMonth.filter(b => b.status === 'pending');
    
    const housesSummary = houses.map(h => {
      const bill = billsForMonth.find(b => b.houseId === h.id);
      return {
        houseId: h.id,
        houseName: h.name,
        isOccupied: h.isOccupied,
        tenantName: h.tenant?.name || 'ไม่มี',
        hasPets: h.tenant?.hasPets || false,
        billingStatus: bill ? (bill.status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ') : 'ยังไม่ได้คำนวณบิล',
        grandTotal: bill ? bill.grandTotal : 0
      };
    });

    return {
      occupiedCount,
      pendingBillsCount: pendingBills.length,
      housesSummary
    };
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = getProjectContext();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10), // send last 10 messages for context
          context
        }),
      });

      if (!response.ok) {
        throw new Error('ขออภัยค่ะ ระบบการเชื่อมต่อขัดข้องชั่วคราว');
      }

      const data = await response.json();
      
      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: data.text || 'ขออภัยค่ะ ฉันไม่สามารถระบุข้อความตอบกลับได้',
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      const errMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: `⚠️ ขัดข้อง: ${error.message || 'โปรดตรวจสอบให้แน่ใจว่าได้ระบุ API Key ในแผง Secrets ของ AI Studio แล้ว'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shortcuts = [
    {
      label: '📝 ร่างใบทวงค่าเช่าสุภาพ',
      prompt: 'ช่วยเขียนร่างข้อความแจ้งหนี้และทวงค่าเช่ารายเดือนอย่างสุภาพ เพื่อส่งให้ผู้เช่าใน Line ของโครงการบ้านสวน'
    },
    {
      label: '🚫 ประกาศห้ามเลี้ยงสัตว์',
      prompt: 'ร่างหนังสือประกาศ/ข้อความแจ้งเตือนผู้เช่าเรื่อง กฎระเบียบเคร่งครัด "ห้ามเลี้ยงสัตว์เลี้ยงทุกชนิดในโครงการบ้านสวนโดยเด็ดขาด" ชี้แจงถึงเหตุผลสุขอนามัยและความสงบเรียบร้อย'
    },
    {
      label: '📊 สรุปยอดค้างชำระเดือนนี้',
      prompt: 'จากข้อมูลโครงการบ้านสวนล่าสุด ช่วยสรุปสถานะการชำระเงินของเดือนนี้ให้หน่อยว่ามีบ้านหลังไหนชำระแล้วบ้าง และหลังไหนยังคงค้างชำระอยู่?'
    },
    {
      label: '🤝 ร่างแจ้งผู้เช่าใหม่',
      prompt: 'ร่างข้อความต้อนรับและสรุปสิ่งอำนวยความสะดวก 6 รายการ และเงื่อนไขสัญญาเช่าขั้นต่ำ 12 เดือน ให้กับผู้เช่ารายใหม่ที่กำลังจะเข้าอยู่'
    }
  ];

  return (
    <div id="ai_assistant_panel" className="bg-white text-natural-text rounded-2xl shadow-sm border border-natural-border flex flex-col h-[650px] overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-natural-primary px-4 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-2 rounded-xl text-white">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-white text-base flex items-center gap-1.5">
              คุณบ้านสวน
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-sans font-semibold bg-white/20 text-white border border-white/20">
                ผู้ช่วยส่วนตัว
              </span>
            </h3>
            <p className="text-2xs text-white/80">ระบบวิเคราะห์ข้อมูลและช่วยเหลือ "โครงการบ้านสวน"</p>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-white/80 animate-pulse" />
      </div>

      {/* Messages */}
      <div className="bg-natural-primary/[0.01] flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
          >
            <div className="flex items-center space-x-1.5 mb-1">
              <span className="text-3xs text-natural-text/40 font-semibold font-mono">
                {msg.sender === 'user' ? 'คุณ (ผู้จัดการ)' : 'คุณบ้านสวน'}
              </span>
            </div>
            
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-2xs relative group ${
                msg.sender === 'user'
                  ? 'bg-natural-primary text-white rounded-tr-none'
                  : 'bg-white text-natural-text border border-natural-border rounded-tl-none'
              }`}
            >
              {msg.text}
              
              {/* Copy action for assistant messages */}
              {msg.sender === 'assistant' && (
                <button
                  onClick={() => handleCopyText(msg.text, index)}
                  className="absolute bottom-1.5 right-1.5 bg-natural-primary/5 hover:bg-natural-primary/10 border border-natural-border p-1 rounded text-natural-primary transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="คัดลอกข้อความ"
                >
                  {copiedIndex === index ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                  ) : (
                    <Clipboard className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start">
            <span className="text-3xs text-natural-text/40 font-mono mb-1">คุณบ้านสวน</span>
            <div className="bg-white text-natural-text border border-natural-border rounded-2xl rounded-tl-none px-4 py-3 text-sm flex items-center space-x-2 shadow-2xs">
              <RefreshCw className="w-4 h-4 text-natural-primary animate-spin" />
              <span className="text-natural-text/60 font-light italic">คุณบ้านสวนกำลังวิเคราะห์ข้อมูลโครงการ...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Shortcuts */}
      <div className="p-4 bg-natural-primary/[0.03] border-t border-natural-border">
        <p className="text-2xs text-natural-primary font-bold mb-2.5 flex items-center gap-1 uppercase tracking-wide">
          <Sparkles className="w-3 h-3 text-natural-primary" /> ทางลัดคำสั่งช่วยเหลือด่วน:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {shortcuts.map((sc, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(sc.prompt)}
              disabled={loading}
              className="text-left text-xs bg-white hover:bg-natural-primary/5 border border-natural-border hover:border-natural-primary rounded-xl p-2.5 text-natural-accent font-semibold transition-all shadow-2xs truncate disabled:opacity-50 cursor-pointer"
              title={sc.prompt}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="p-4 bg-white border-t border-natural-border flex items-center space-x-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์คำถามหรือสอบถามคุณบ้านสวนที่นี่..."
          disabled={loading}
          className="flex-1 bg-natural-primary/[0.02] border border-natural-border rounded-xl px-4 py-3 text-sm text-natural-text placeholder-natural-text/40 focus:outline-none focus:border-natural-primary focus:bg-white transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-natural-primary hover:bg-natural-dark-hover active:bg-natural-accent text-white p-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
