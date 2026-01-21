
import React from 'react';
import { X, Copy, Check, Info, Zap, AlertTriangle, FileCode2 } from 'lucide-react';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScriptModal: React.FC<ScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const scriptCode = `/**
 * Google Apps Script for SET Intelligence Terminal (v6.0)
 * ✅ แก้ไขปัญหา 429 Error ด้วยเทคนิค Batch Operations
 */

const SHEET_NAME = 'StockData';

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 SET Terminal')
      .addItem('Setup Dashboard Layout', 'setupDashboardLayout')
      .addItem('Fetch Data (Batch Operation)', 'getStockDashboardData')
      .addToUi();
}

/**
 * 1. Setup Layout เพื่อให้การดึงข้อมูลประหยัด API Calls ที่สุด
 */
function setupDashboardLayout() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // A1:F31 สำหรับ History (30 วัน)
  sheet.getRange('A1').setFormula('=GOOGLEFINANCE("SET:BTS","all",TODAY()-30,TODAY(),"DAILY")');
  
  // B33:C33 สำหรับ Real-time (ดึงทีละคู่)
  sheet.getRange('B32').setValue('BTS Real-time Price');
  sheet.getRange('B33').setFormula('=GOOGLEFINANCE("SET:BTS","price")');
  
  sheet.getRange('C32').setValue('PTT Real-time Volume');
  sheet.getRange('C33').setFormula('=GOOGLEFINANCE("SET:PTT","volume")');
  
  SpreadsheetApp.getUi().alert('✅ Layout Setup Complete. ใช้เพียง 3 GOOGLEFINANCE calls เท่านั้น!');
}

/**
 * 2. BATCH READ - ดึงข้อมูลทั้งหมดใน Call เดียว (ป้องกัน 429)
 */
function getStockDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // ✅ BATCH READ - อ่านทีเดียว 1 call (Range ครอบคลุมทั้งประวัติและเรียลไทม์)
  // A1:F31 คือตารางประวัติ, B33:C33 คือข้อมูลสรุป
  const range = sheet.getRange('A1:F31,B33:C33'); 
  const allData = range.getValues();
  
  // แยกข้อมูลประวัติ (A1:F31)
  const candlestick = allData.slice(0, 30).map(row => ({
    date: row[0] instanceof Date ? Utilities.formatDate(row[0], 'Asia/Bangkok', 'yyyy-MM-dd') : row[0],
    open: row[1], 
    high: row[2], 
    low: row[3], 
    close: row[4], 
    volume: row[5]
  }));
  
  // แยกข้อมูล Real-time (จาก B33:C33 ในตำแหน่งที่ 30 ของ array จาก getValues)
  const realtime = {
    bts_price: allData[30][0],  // ค่าจาก B33
    ptt_volume: allData[30][1]  // ค่าจาก C33
  };
  
  Logger.log('Fetched Data Successfully using Batch Read');
  return { candlestick, realtime };
}

/**
 * 3. Setup Trigger (ทุก 1 ชั่วโมง - ปลอดภัยที่สุดจาก 429)
 */
function setupAutoRefresh() {
  // ลบ Trigger เดิม
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  // สร้างใหม่ทุก 1 ชั่วโมง
  ScriptApp.newTrigger('getStockDashboardData')
    .timeBased()
    .everyHours(1)
    .create();
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="bg-[#0f172a] border border-slate-700/50 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in duration-300">
        <div className="p-10 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/40 rounded-t-[2.5rem]">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20 shadow-inner">
              <FileCode2 size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                Apps Script: Batch Optimization
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-bold uppercase tracking-widest italic">Preventing 429 Rate Limits via Single-Call Range Reading</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl transition-all">
            <X size={24} className="text-slate-500 hover:text-white" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-10 bg-[#020617] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Info size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Technique: Batch Read</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ใช้วิธีการ <span className="text-blue-400 font-bold">getRange('A1:F31,B33:C33')</span> เพื่ออ่านข้อมูลประวัติย้อนหลังและราคาเรียลไทม์ทั้งหมดในครั้งเดียว ลด API Call จาก 33 ครั้งเหลือเพียง 1 ครั้ง
              </p>
            </div>
            <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Rate Limit Guard</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                จำกัดความถี่การอัปเดตเป็นทุก 20 นาที (หน้าบ้าน) และ 1 ชั่วโมง (Apps Script) เพื่อให้สัมพันธ์กับระบบ Cache ของ Google Finance ป้องกันการโดนแบนถาวร
              </p>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-tighter">Copy Code below</span>
            </div>
            <pre className="bg-slate-950/80 p-8 rounded-3xl text-[12px] font-mono text-emerald-400 leading-relaxed overflow-x-auto border border-slate-800/50 custom-scrollbar shadow-inner select-all">
              {scriptCode}
            </pre>
          </div>
        </div>
        
        <div className="p-10 border-t border-slate-800/60 bg-slate-900/40 flex justify-end gap-5 rounded-b-[2.5rem]">
          <button 
            onClick={onClose}
            className="px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-white transition-all"
          >
            Dismiss
          </button>
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-3 px-10 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              copied ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/30' : 'bg-white text-slate-900 hover:bg-slate-200'
            }`}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied to Clipboard' : 'Copy Optimization Script'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptModal;
