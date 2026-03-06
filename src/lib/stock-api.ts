import { PriceData, Market } from '@/types';

// Fetch Taiwan stock price from TWSE
async function fetchTWStockPrice(symbol: string): Promise<PriceData | null> {
  try {
    const response = await fetch(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0`,
      { next: { revalidate: 30 } }
    );
    const data = await response.json();

    if (!data.msgArray || data.msgArray.length === 0) {
      // Try OTC market
      const otcResponse = await fetch(
        `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_${symbol}.tw&json=1&delay=0`,
        { next: { revalidate: 30 } }
      );
      const otcData = await otcResponse.json();
      if (!otcData.msgArray || otcData.msgArray.length === 0) return null;
      return parseTWStockData(otcData.msgArray[0]);
    }

    return parseTWStockData(data.msgArray[0]);
  } catch (error) {
    console.error(`Error fetching TW stock ${symbol}:`, error);
    return null;
  }
}

function parseTWStockData(data: Record<string, string>): PriceData {
  const currentPrice = parseFloat(data.z) || parseFloat(data.y) || 0;
  const previousClose = parseFloat(data.y) || 0;
  const change = currentPrice - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol: data.c,
    name: data.n,
    market: 'TW',
    currentPrice,
    previousClose,
    change,
    changePercent,
    high: parseFloat(data.h) || 0,
    low: parseFloat(data.l) || 0,
    volume: parseInt(data.v) || 0,
    updatedAt: new Date(),
  };
}

// Fetch US stock price using Yahoo Finance
async function fetchUSStockPrice(symbol: string): Promise<PriceData | null> {
  try {
    const yahooFinance = (await import('yahoo-finance2')).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(symbol);

    if (!quote) return null;

    return {
      symbol: quote.symbol || symbol,
      name: quote.shortName || quote.longName || symbol,
      market: 'US',
      currentPrice: quote.regularMarketPrice || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      high: quote.regularMarketDayHigh || 0,
      low: quote.regularMarketDayLow || 0,
      volume: quote.regularMarketVolume || 0,
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(`Error fetching US stock ${symbol}:`, error);
    return null;
  }
}

export async function fetchStockPrice(symbol: string, market: Market): Promise<PriceData | null> {
  if (market === 'TW') {
    return fetchTWStockPrice(symbol);
  }
  return fetchUSStockPrice(symbol);
}

// 台股搜尋：從 TWSE/TPEX 開放資料抓上市+上櫃股票清單，支援代碼和名稱搜尋
let twStockCache: { symbol: string; name: string }[] | null = null;
let twStockCacheTime = 0;
const TW_CACHE_DURATION = 24 * 60 * 60 * 1000; // 快取 24 小時

async function fetchTWStockList(): Promise<{ symbol: string; name: string }[]> {
  if (twStockCache && Date.now() - twStockCacheTime < TW_CACHE_DURATION) {
    return twStockCache;
  }

  const stocks: { symbol: string; name: string }[] = [];

  try {
    // 上市股票 (TWSE)
    const tseRes = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', {
      next: { revalidate: 86400 },
    });
    const tseData = await tseRes.json();
    if (Array.isArray(tseData)) {
      for (const item of tseData) {
        if (item.Code && item.Name) {
          stocks.push({ symbol: item.Code, name: item.Name });
        }
      }
    }
  } catch (e) {
    console.error('Error fetching TWSE stock list:', e);
  }

  try {
    // 上櫃股票 (TPEX)
    const otcRes = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes', {
      next: { revalidate: 86400 },
    });
    const otcData = await otcRes.json();
    if (Array.isArray(otcData)) {
      for (const item of otcData) {
        const code = item.SecuritiesCompanyCode || item.Code;
        const name = item.CompanyName || item.Name;
        if (code && name) {
          stocks.push({ symbol: code, name });
        }
      }
    }
  } catch (e) {
    console.error('Error fetching TPEX stock list:', e);
  }

  if (stocks.length > 0) {
    twStockCache = stocks;
    twStockCacheTime = Date.now();
  }

  return stocks;
}

export async function searchTWStocks(query: string): Promise<{ symbol: string; name: string; market: Market }[]> {
  const allStocks = await fetchTWStockList();
  const q = query.toLowerCase().trim();

  const results = allStocks.filter(
    (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  );

  return results.slice(0, 15).map((s) => ({
    symbol: s.symbol,
    name: s.name,
    market: 'TW' as Market,
  }));
}

// 搜尋美股（透過 yahoo-finance2 的 search）
export async function searchUSStocks(query: string): Promise<{ symbol: string; name: string; market: Market }[]> {
  try {
    const yahooFinance = (await import('yahoo-finance2')).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(query);
    if (!result?.quotes) return [];

    return result.quotes
      .filter((q: any) => q.quoteType === 'EQUITY' && q.symbol)
      .slice(0, 10)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        market: 'US' as Market,
      }));
  } catch (error) {
    console.error('US stock search error:', error);
    return [];
  }
}

export async function fetchMultipleStockPrices(
  stocks: { symbol: string; market: Market }[]
): Promise<Map<string, PriceData>> {
  const priceMap = new Map<string, PriceData>();

  const results = await Promise.allSettled(
    stocks.map(async ({ symbol, market }) => {
      const price = await fetchStockPrice(symbol, market);
      if (price) {
        priceMap.set(`${market}_${symbol}`, price);
      }
    })
  );

  return priceMap;
}
