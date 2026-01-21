
import React, { useState } from 'react';
import { Stock } from '../types';
import { Download, FileSpreadsheet, Info, Clipboard, Zap, CheckCircle2 } from 'lucide-react';

interface SheetViewProps {
  stocks: Stock[];
}

const SheetView: React.FC<SheetViewProps> = ({ stocks }) => {
  const [selectedCell, setSelectedCell] = useState<{row: number, col: string} | null>(null);
  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const headers = ['Ticker', 'Legal Entity Name', 'Price (THB)', 'Day Delta', 'Market Capitalization', 'Source Formula', 'Last Update'];

  const getFormula = (symbol: string, type: string) => {
    const ticker = `SET:${symbol}`;
    switch(type) {
      case 'price': return `=GOOGLEFINANCE("${ticker}", "price")`;
      case 'chg': return `=GOOGLEFINANCE("${ticker}", "changepct")/100`;
      case 'cap': return `=GOOGLEFINANCE("${ticker}", "marketcap")`;
      default: return `=GOOGLEFINANCE("${ticker}", "all")`;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportToCSV = () => {
    const BOM = '\uFEFF';
    const csvHeaders = headers.join(',');
    const csvRows = stocks.map(stock => {
      const row = [
        stock.symbol,
        `"${stock.fullName.replace(/"/g, '""')}"`,
        stock.price.toFixed(2),
        stock.changePercent.toFixed(2) + '%',
        `"${stock.marketCap}"`,
        `"${getFormula(stock.symbol, 'price')}"`,
        stock.lastUpdated || 'Initial'
      ];
      return row.join(',');
    });

    const csvString = BOM + [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SET50_EXECUTIVE_ANALYSIS_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white text-slate-800 rounded-3xl overflow-hidden border border-slate-100 flex flex-col h-full min-h-[600px]">
      <div className="bg-white border-b border-slate-100 p-8 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-600/30">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 block uppercase tracking-tighter">Analytical Grid</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Financial Data Core Synchronization</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black border border-slate-100 uppercase tracking-widest shadow-inner">
              <CheckCircle2 size={14} className="text-red-600" /> Validated
            </div>
            <button 
              onClick={exportToCSV}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all shadow-md flex items-center gap-3 active:scale-95"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-3 shadow-inner group">
          <div className="flex items-center gap-2 pr-6 border-r border-slate-200">
            <span className="text-[12px] font-black text-red-600 italic tracking-tighter">fx</span>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Formula</span>
          </div>
          <input 
            type="text" 
            readOnly 
            value={selectedCell ? (selectedCell.col === 'F' ? getFormula(stocks[selectedCell.row]?.symbol, 'price') : (selectedCell.col === 'A' ? stocks[selectedCell.row]?.symbol : stocks[selectedCell.row]?.fullName)) : 'SELECT CELL TO REVEAL SOURCE FORMULA...'}
            className="flex-1 bg-transparent text-[12px] outline-none text-slate-700 font-mono font-bold tracking-tight placeholder:text-slate-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#fafbfc] p-8">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="border-b border-r border-slate-100 w-12 py-4 text-center text-slate-300 font-black">#</th>
                {columns.map(col => (
                  <th key={col} className="border-b border-r border-slate-100 py-4 text-center font-black text-slate-900 uppercase tracking-widest w-40">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border-b border-r border-slate-100 text-center text-slate-200 font-bold bg-slate-50/20">1</td>
                {headers.map((h, i) => (
                  <td key={i} className="border-b border-r border-slate-100 px-5 py-3 font-black text-slate-400 bg-slate-50/40 text-center uppercase tracking-widest text-[9px]">
                    {h}
                  </td>
                ))}
              </tr>
              {stocks.map((stock, idx) => (
                <tr key={stock.symbol} className="hover:bg-red-50/10 transition-all duration-300 group">
                  <td className="border-b border-r border-slate-100 text-center text-slate-200 font-bold bg-slate-50/10">{idx + 2}</td>
                  <td 
                    className={`border-b border-r border-slate-100 px-6 py-4 font-black text-red-600 cursor-pointer text-sm ${selectedCell?.row === idx && selectedCell?.col === 'A' ? 'bg-red-50 ring-2 ring-red-600 ring-inset' : ''}`}
                    onClick={() => setSelectedCell({row: idx, col: 'A'})}
                  >
                    {stock.symbol}
                  </td>
                  <td className="border-b border-r border-slate-100 px-6 py-4 text-slate-500 font-bold uppercase tracking-tight text-[10px]">{stock.fullName}</td>
                  <td className="border-b border-r border-slate-100 px-6 py-4 text-right font-black text-slate-900 tabular-nums text-sm">฿{stock.price.toFixed(2)}</td>
                  <td className={`border-b border-r border-slate-100 px-6 py-4 text-right font-black tabular-nums text-sm ${stock.changePercent >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>
                    {stock.changePercent.toFixed(2)}%
                  </td>
                  <td className="border-b border-r border-slate-100 px-6 py-4 text-right text-slate-400 font-bold tracking-tight">{stock.marketCap}</td>
                  <td className={`border-b border-r border-slate-100 px-6 py-4 cursor-pointer group/cell transition-all ${selectedCell?.row === idx && selectedCell?.col === 'F' ? 'bg-red-50 ring-2 ring-red-600 ring-inset' : ''}`} onClick={() => setSelectedCell({row: idx, col: 'F'})}>
                    <div className="flex items-center justify-between gap-4">
                      <code className="text-[10px] text-slate-200 font-mono truncate max-w-[120px] group-hover/cell:text-red-500 transition-colors">
                        {getFormula(stock.symbol, 'price')}
                      </code>
                      <button onClick={(e) => { e.stopPropagation(); copyToClipboard(getFormula(stock.symbol, 'price')); }} className="p-2 bg-slate-50 hover:bg-red-600 hover:text-white rounded-lg transition-all text-slate-300 opacity-0 group-hover/cell:opacity-100 border border-slate-100">
                        <Clipboard size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="border-b border-r border-slate-100 px-6 py-4 text-center text-slate-300 italic font-bold">
                    {stock.lastUpdated || 'SYNC'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SheetView;
