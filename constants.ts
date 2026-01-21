
import { Stock, MarketSummary, HistoryItem } from './types';

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const getPreviousTradingDay = (date: Date, offset: number = 1) => {
  const result = new Date(date);
  let count = 0;
  while (count < offset) {
    result.setDate(result.getDate() - 1);
    if (!isWeekend(result)) {
      count++;
    }
  }
  return result;
};

const calculateMA = (data: HistoryItem[], period: number) => {
  return data.map((item, index) => {
    if (index < period - 1) return { ...item };
    const slice = data.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, curr) => acc + (curr.close || curr.price), 0);
    return { ...item, [`ma${period}`]: Number((sum / period).toFixed(2)) };
  });
};

const calculateEMA = (data: HistoryItem[], period: number) => {
  if (data.length === 0) return data;
  let prevEma = data[0].price;
  const k = 2 / (period + 1);
  return data.map((item, index) => {
    if (index === 0) return { ...item, [`ema${period}`]: prevEma };
    const currentPrice = item.close || item.price;
    const ema = (currentPrice - prevEma) * k + prevEma;
    prevEma = ema;
    return { ...item, [`ema${period}`]: Number(ema.toFixed(2)) };
  });
};

export const generateHistoryForPeriod = (basePrice: number, period: string, volatility: number = 0.015): HistoryItem[] => {
  let data: HistoryItem[] = [];
  const now = new Date();

  const generateOHLC = (price: number, vol: number) => {
    const dayChange = price * (Math.random() * vol - vol / 2);
    const open = price - dayChange / 2;
    const close = price + dayChange / 2;
    const high = Math.max(open, close) + Math.random() * (price * 0.008);
    const low = Math.min(open, close) - Math.random() * (price * 0.008);
    const volume = Math.floor(Math.random() * 5000000) + 1000000;
    return { open, high, low, close, volume };
  };

  switch (period) {
    case '1 วัน': {
      let currentPrice = basePrice;
      for (let m = 600; m <= 750; m += 5) {
        const hh = Math.floor(m / 60);
        const mm = m % 60;
        const timeStr = `${hh}:${mm === 0 ? '00' : mm < 10 ? '0' + mm : mm}`;
        const factor = 1 + (Math.random() * (volatility / 4) - (volatility / 8));
        currentPrice = Number((currentPrice * factor).toFixed(2));
        data.push({ time: timeStr, price: currentPrice, ...generateOHLC(currentPrice, 0.001) });
      }
      const lunchPrice = currentPrice;
      for (let m = 755; m < 855; m += 15) {
        const hh = Math.floor(m / 60);
        const mm = m % 60;
        data.push({ time: `${hh}:${mm === 0 ? '00' : mm < 10 ? '0' + mm : mm}`, price: lunchPrice, isLunch: true, open: lunchPrice, close: lunchPrice, high: lunchPrice, low: lunchPrice, volume: 0 });
      }
      for (let m = 855; m <= 990; m += 5) {
        const hh = Math.floor(m / 60);
        const mm = m % 60;
        const factor = 1 + (Math.random() * (volatility / 4) - (volatility / 8));
        currentPrice = Number((currentPrice * factor).toFixed(2));
        data.push({ time: `${hh}:${mm === 0 ? '00' : mm < 10 ? '0' + mm : mm}`, price: currentPrice, ...generateOHLC(currentPrice, 0.001) });
      }
      break;
    }
    default:
      const days = 30;
      for (let i = days; i >= 0; i--) {
        const d = getPreviousTradingDay(now, i);
        const timeStr = `${d.getDate()} ${TH_MONTHS[d.getMonth()]}`;
        const price = basePrice * (1 + (Math.random() * volatility * 2 - volatility));
        data.push({ time: timeStr, price, ...generateOHLC(price, volatility) });
      }
  }

  data = calculateMA(data, 7);
  data = calculateMA(data, 21);
  data = calculateEMA(data, 5);
  return data;
};

export const INITIAL_STOCKS: Stock[] = [
  { symbol: "ADVANC", name: "ADVANC", fullName: "Advanced Info Service", sector: "ICT", price: 294.00, prevClose: 292.00, priceYearEnd: 218.00, change: 2.00, changePercent: 0.68, volume: "5.5M", marketCap: "874B", history: generateHistoryForPeriod(294, "1 วัน") },
  { symbol: "AOT", name: "AOT", fullName: "Airports of Thailand", sector: "Transportation", price: 58.75, prevClose: 59.50, priceYearEnd: 59.75, change: -0.75, changePercent: -1.26, volume: "12M", marketCap: "839B", history: generateHistoryForPeriod(58.75, "1 วัน") },
  { symbol: "AWC", name: "AWC", fullName: "Asset World Corp", sector: "Property", price: 3.86, prevClose: 3.82, priceYearEnd: 3.60, change: 0.04, changePercent: 1.05, volume: "45M", marketCap: "123B", history: generateHistoryForPeriod(3.86, "1 วัน") },
  { symbol: "BANPU", name: "BANPU", fullName: "Banpu", sector: "Energy", price: 5.55, prevClose: 5.60, priceYearEnd: 6.80, change: -0.05, changePercent: -0.89, volume: "22M", marketCap: "55B", history: generateHistoryForPeriod(5.55, "1 วัน") },
  { symbol: "BBL", name: "BBL", fullName: "Bangkok Bank", sector: "Banking", price: 154.50, prevClose: 153.00, priceYearEnd: 156.00, change: 1.50, changePercent: 0.98, volume: "4.2M", marketCap: "295B", history: generateHistoryForPeriod(154.5, "1 วัน") },
  { symbol: "BDMS", name: "BDMS", fullName: "Bangkok Dusit Medical Services", sector: "Health Care", price: 26.25, prevClose: 26.50, priceYearEnd: 27.25, change: -0.25, changePercent: -0.94, volume: "18M", marketCap: "417B", history: generateHistoryForPeriod(26.25, "1 วัน") },
  { symbol: "BEM", name: "BEM", fullName: "Bangkok Expressway and Metro", sector: "Transportation", price: 8.05, prevClose: 8.10, priceYearEnd: 7.95, change: -0.05, changePercent: -0.62, volume: "15M", marketCap: "123B", history: generateHistoryForPeriod(8.05, "1 วัน") },
  { symbol: "BGRIM", name: "BGRIM", fullName: "B.Grimm Power", sector: "Energy", price: 21.40, prevClose: 21.10, priceYearEnd: 27.50, change: 0.30, changePercent: 1.42, volume: "6.5M", marketCap: "56B", history: generateHistoryForPeriod(21.4, "1 วัน") },
  { symbol: "BH", name: "BH", fullName: "Bumrungrad Hospital", sector: "Health Care", price: 272.00, prevClose: 268.00, priceYearEnd: 222.00, change: 4.00, changePercent: 1.49, volume: "1.5M", marketCap: "216B", history: generateHistoryForPeriod(272, "1 วัน") },
  { symbol: "BJC", name: "BJC", fullName: "Berli Jucker", sector: "Commerce", price: 24.30, prevClose: 24.10, priceYearEnd: 24.50, change: 0.20, changePercent: 0.83, volume: "3.2M", marketCap: "97B", history: generateHistoryForPeriod(24.3, "1 วัน") },
  { symbol: "BTS", name: "BTS", fullName: "BTS Group Holdings", sector: "Transportation", price: 4.52, prevClose: 4.56, priceYearEnd: 7.15, change: -0.04, changePercent: -0.88, volume: "55M", marketCap: "59B", history: generateHistoryForPeriod(4.52, "1 วัน") },
  // Fixed: Removed duplicate 'sector' property for CBG stock entry
  { symbol: "CBG", name: "CBG", fullName: "Carabao Group", sector: "Food & Beverage", price: 73.25, prevClose: 72.00, priceYearEnd: 81.50, change: 1.25, changePercent: 1.74, volume: "2.8M", marketCap: "73B", history: generateHistoryForPeriod(73.25, "1 วัน") },
  { symbol: "CENTEL", name: "CENTEL", fullName: "Central Plaza Hotel", sector: "Tourism", price: 36.75, prevClose: 37.00, priceYearEnd: 43.50, change: -0.25, changePercent: -0.68, volume: "2.5M", marketCap: "49B", history: generateHistoryForPeriod(36.75, "1 วัน") },
  { symbol: "COM7", name: "COM7", fullName: "Com7", sector: "Commerce", price: 24.10, prevClose: 23.80, priceYearEnd: 26.50, change: 0.30, changePercent: 1.26, volume: "11M", marketCap: "57B", history: generateHistoryForPeriod(24.1, "1 วัน") },
  { symbol: "CPALL", name: "CPALL", fullName: "CP ALL", sector: "Commerce", price: 65.75, prevClose: 65.00, priceYearEnd: 55.50, change: 0.75, changePercent: 1.15, volume: "18M", marketCap: "591B", history: generateHistoryForPeriod(65.75, "1 วัน") },
  { symbol: "CPF", name: "CPF", fullName: "Charoen Pokphand Foods", sector: "Food & Beverage", price: 24.10, prevClose: 23.90, priceYearEnd: 18.80, change: 0.20, changePercent: 0.84, volume: "15M", marketCap: "198B", history: generateHistoryForPeriod(24.1, "1 วัน") },
  { symbol: "CPN", name: "CPN", fullName: "Central Pattana", sector: "Property", price: 68.50, prevClose: 67.75, priceYearEnd: 69.50, change: 0.75, changePercent: 1.11, volume: "5.2M", marketCap: "307B", history: generateHistoryForPeriod(68.5, "1 วัน") },
  { symbol: "CRC", name: "CRC", fullName: "Central Retail Corporation", sector: "Commerce", price: 32.75, prevClose: 32.50, priceYearEnd: 39.75, change: 0.25, changePercent: 0.77, volume: "8.1M", marketCap: "197B", history: generateHistoryForPeriod(32.75, "1 วัน") },
  { symbol: "DELTA", name: "DELTA", fullName: "Delta Electronics (Thailand)", sector: "Electronic", price: 168.50, prevClose: 165.00, priceYearEnd: 88.00, change: 3.50, changePercent: 2.12, volume: "15.2M", marketCap: "2.10T", history: generateHistoryForPeriod(168.5, "1 วัน") },
  { symbol: "EA", name: "EA", fullName: "Energy Absolute", sector: "Energy", price: 7.80, prevClose: 7.95, priceYearEnd: 44.50, change: -0.15, changePercent: -1.89, volume: "120M", marketCap: "29B", history: generateHistoryForPeriod(7.80, "1 วัน") },
  { symbol: "EGCO", name: "EGCO", fullName: "Electricity Generating", sector: "Energy", price: 111.50, prevClose: 112.00, priceYearEnd: 127.50, change: -0.50, changePercent: -0.45, volume: "0.4M", marketCap: "59B", history: generateHistoryForPeriod(111.5, "1 วัน") },
  { symbol: "GLOBAL", name: "GLOBAL", fullName: "Siam Global House", sector: "Commerce", price: 14.90, prevClose: 15.00, priceYearEnd: 16.80, change: -0.10, changePercent: -0.67, volume: "5.5M", marketCap: "74B", history: generateHistoryForPeriod(14.9, "1 วัน") },
  { symbol: "GPSC", name: "GPSC", fullName: "Global Power Synergy", sector: "Energy", price: 42.50, prevClose: 42.75, priceYearEnd: 48.25, change: -0.25, changePercent: -0.58, volume: "6.2M", marketCap: "120B", history: generateHistoryForPeriod(42.5, "1 วัน") },
  { symbol: "GULF", name: "GULF", fullName: "Gulf Energy Development", sector: "Energy", price: 68.75, prevClose: 68.00, priceYearEnd: 44.75, change: 0.75, changePercent: 1.10, volume: "9.5M", marketCap: "807B", history: generateHistoryForPeriod(68.75, "1 วัน") },
  { symbol: "HMPRO", name: "HMPRO", fullName: "Home Product Center", sector: "Commerce", price: 10.10, prevClose: 10.20, priceYearEnd: 11.70, change: -0.10, changePercent: -0.98, volume: "22M", marketCap: "133B", history: generateHistoryForPeriod(10.1, "1 วัน") },
  { symbol: "INTUCH", name: "INTUCH", fullName: "Intouch Holdings", sector: "ICT", price: 114.50, prevClose: 112.00, priceYearEnd: 71.25, change: 2.50, changePercent: 2.23, volume: "4.8M", marketCap: "367B", history: generateHistoryForPeriod(114.5, "1 วัน") },
  { symbol: "IRPC", name: "IRPC", fullName: "IRPC", sector: "Energy", price: 1.49, prevClose: 1.51, priceYearEnd: 1.98, change: -0.02, changePercent: -1.32, volume: "95M", marketCap: "30B", history: generateHistoryForPeriod(1.49, "1 วัน") },
  { symbol: "IVL", name: "IVL", fullName: "Indorama Ventures", sector: "Petrochemicals", price: 23.60, prevClose: 23.80, priceYearEnd: 27.25, change: -0.20, changePercent: -0.84, volume: "12M", marketCap: "132B", history: generateHistoryForPeriod(23.6, "1 วัน") },
  { symbol: "JAS", name: "JAS", fullName: "Jasmine International", sector: "ICT", price: 2.32, prevClose: 2.34, priceYearEnd: 2.10, change: -0.02, changePercent: -0.85, volume: "52M", marketCap: "19B", history: generateHistoryForPeriod(2.32, "1 วัน") },
  { symbol: "JMART", name: "JMART", fullName: "Jaymart Group Holdings", sector: "Commerce", price: 13.90, prevClose: 14.00, priceYearEnd: 18.20, change: -0.10, changePercent: -0.71, volume: "9.2M", marketCap: "20B", history: generateHistoryForPeriod(13.9, "1 วัน") },
  { symbol: "JMT", name: "JMT", fullName: "JMT Network Services", sector: "Finance", price: 17.60, prevClose: 18.00, priceYearEnd: 25.50, change: -0.40, changePercent: -2.22, volume: "14M", marketCap: "26B", history: generateHistoryForPeriod(17.6, "1 วัน") },
  { symbol: "KBANK", name: "KBANK", fullName: "Kasikornbank", sector: "Banking", price: 154.50, prevClose: 153.00, priceYearEnd: 134.50, change: 1.50, changePercent: 0.98, volume: "5.1M", marketCap: "366B", history: generateHistoryForPeriod(154.5, "1 วัน") },
  { symbol: "KCE", name: "KCE", fullName: "KCE Electronics", sector: "Electronic", price: 33.50, prevClose: 33.75, priceYearEnd: 54.50, change: -0.25, changePercent: -0.74, volume: "6.2M", marketCap: "40B", history: generateHistoryForPeriod(33.5, "1 วัน") },
  { symbol: "KKP", name: "KKP", fullName: "Kiatnakin Phatra Bank", sector: "Banking", price: 51.50, prevClose: 51.75, priceYearEnd: 50.50, change: -0.25, changePercent: -0.48, volume: "2.1M", marketCap: "43B", history: generateHistoryForPeriod(51.5, "1 วัน") },
  { symbol: "KTB", name: "KTB", fullName: "Krung Thai Bank", sector: "Banking", price: 20.40, prevClose: 20.20, priceYearEnd: 18.40, change: 0.20, changePercent: 0.99, volume: "25M", marketCap: "285B", history: generateHistoryForPeriod(20.4, "1 วัน") },
  { symbol: "KTC", name: "KTC", fullName: "Krungthai Card", sector: "Finance", price: 44.50, prevClose: 44.75, priceYearEnd: 43.25, change: -0.25, changePercent: -0.56, volume: "3.5M", marketCap: "115B", history: generateHistoryForPeriod(44.5, "1 วัน") },
  { symbol: "LH", name: "LH", fullName: "Land and Houses", sector: "Property", price: 6.00, prevClose: 6.05, priceYearEnd: 8.10, change: -0.05, changePercent: -0.83, volume: "32M", marketCap: "72B", history: generateHistoryForPeriod(6.00, "1 วัน") },
  { symbol: "MINT", name: "MINT", fullName: "Minor International", sector: "Tourism", price: 28.50, prevClose: 28.75, priceYearEnd: 29.50, change: -0.25, changePercent: -0.87, volume: "10M", marketCap: "161B", history: generateHistoryForPeriod(28.5, "1 วัน") },
  { symbol: "MTC", name: "MTC", fullName: "Muangthai Capital", sector: "Finance", price: 49.25, prevClose: 48.75, priceYearEnd: 44.75, change: 0.50, changePercent: 1.03, volume: "5.1M", marketCap: "104B", history: generateHistoryForPeriod(49.25, "1 วัน") },
  { symbol: "OR", name: "OR", fullName: "PTT Oil and Retail Business", sector: "Energy", price: 15.90, prevClose: 16.10, priceYearEnd: 19.10, change: -0.20, changePercent: -1.24, volume: "14M", marketCap: "191B", history: generateHistoryForPeriod(15.9, "1 วัน") },
  { symbol: "OSP", name: "OSP", fullName: "Osotspa", sector: "Food & Beverage", price: 21.90, prevClose: 22.10, priceYearEnd: 21.80, change: -0.20, changePercent: -0.90, volume: "6.8M", marketCap: "66B", history: generateHistoryForPeriod(21.9, "1 วัน") },
  { symbol: "PTT", name: "PTT", fullName: "PTT", sector: "Energy", price: 33.75, prevClose: 34.00, priceYearEnd: 35.50, change: -0.25, changePercent: -0.74, volume: "18.5M", marketCap: "964B", history: generateHistoryForPeriod(33.75, "1 วัน") },
  { symbol: "PTTEP", name: "PTTEP", fullName: "PTT Exploration and Production", sector: "Energy", price: 131.50, prevClose: 133.00, priceYearEnd: 149.00, change: -1.50, changePercent: -1.13, volume: "8.2M", marketCap: "522B", history: generateHistoryForPeriod(131.5, "1 วัน") },
  { symbol: "PTTGC", name: "PTTGC", fullName: "PTT Global Chemical", sector: "Petrochemicals", price: 27.00, prevClose: 27.50, priceYearEnd: 37.75, change: -0.50, changePercent: -1.82, volume: "11M", marketCap: "122B", history: generateHistoryForPeriod(27.00, "1 วัน") },
  { symbol: "RATCH", name: "RATCH", fullName: "Ratch Group", sector: "Energy", price: 30.75, prevClose: 31.00, priceYearEnd: 31.25, change: -0.25, changePercent: -0.81, volume: "2.8M", marketCap: "67B", history: generateHistoryForPeriod(30.75, "1 วัน") },
  { symbol: "SAWAD", name: "SAWAD", fullName: "Srisawad Corporation", sector: "Finance", price: 37.75, prevClose: 38.00, priceYearEnd: 41.25, change: -0.25, changePercent: -0.66, volume: "5.2M", marketCap: "51B", history: generateHistoryForPeriod(37.75, "1 วัน") },
  { symbol: "SCB", name: "SCB", fullName: "SCB X", sector: "Banking", price: 117.50, prevClose: 116.00, priceYearEnd: 106.00, change: 1.50, changePercent: 1.29, volume: "8.5M", marketCap: "395B", history: generateHistoryForPeriod(117.5, "1 วัน") },
  { symbol: "SCC", name: "SCC", fullName: "Siam Cement", sector: "Construction", price: 214.00, prevClose: 217.00, priceYearEnd: 304.00, change: -3.00, changePercent: -1.38, volume: "1.5M", marketCap: "257B", history: generateHistoryForPeriod(214, "1 วัน") },
  { symbol: "SCGP", name: "SCGP", fullName: "SCG Packaging", sector: "Packaging", price: 25.50, prevClose: 26.00, priceYearEnd: 35.75, change: -0.50, changePercent: -1.92, volume: "6.2M", marketCap: "109B", history: generateHistoryForPeriod(25.5, "1 วัน") },
  { symbol: "TISCO", name: "TISCO", fullName: "Tisco Financial Group", sector: "Banking", price: 99.25, prevClose: 99.00, priceYearEnd: 99.25, change: 0.25, changePercent: 0.25, volume: "1.8M", marketCap: "79B", history: generateHistoryForPeriod(99.25, "1 วัน") },
  { symbol: "TOP", name: "TOP", fullName: "Thai Oil", sector: "Energy", price: 48.25, prevClose: 48.75, priceYearEnd: 53.50, change: -0.50, changePercent: -1.03, volume: "6.8M", marketCap: "107B", history: generateHistoryForPeriod(48.25, "1 วัน") },
  { symbol: "TRUE", name: "TRUE", fullName: "True Corporation", sector: "ICT", price: 12.40, prevClose: 12.20, priceYearEnd: 5.05, change: 0.20, changePercent: 1.64, volume: "52M", marketCap: "429B", history: generateHistoryForPeriod(12.4, "1 วัน") },
  { symbol: "TTB", name: "TTB", fullName: "TMBThanachart Bank", sector: "Banking", price: 1.94, prevClose: 1.92, priceYearEnd: 1.67, change: 0.02, changePercent: 1.04, volume: "185M", marketCap: "188B", history: generateHistoryForPeriod(1.94, "1 วัน") },
  { symbol: "TU", name: "TU", fullName: "Thai Union Group", sector: "Food & Beverage", price: 14.30, prevClose: 14.50, priceYearEnd: 15.10, change: -0.20, changePercent: -1.38, volume: "12M", marketCap: "67B", history: generateHistoryForPeriod(14.3, "1 วัน") },
  { symbol: "WHA", name: "WHA", fullName: "WHA Corporation", sector: "Property", price: 5.90, prevClose: 5.85, priceYearEnd: 5.30, change: 0.05, changePercent: 0.85, volume: "42M", marketCap: "88B", history: generateHistoryForPeriod(5.90, "1 วัน") }
];

export const MARKET_SUMMARIES: MarketSummary[] = [
  { index: "SET", value: 1450.42, change: -1.15, changePercent: -0.08 },
  { index: "SET50", value: 894.12, change: 1.25, changePercent: 0.14 },
  { index: "MAI", value: 337.45, change: -0.42, changePercent: -0.12 }
];
