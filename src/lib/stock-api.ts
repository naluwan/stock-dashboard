import { PriceData, Market } from '@/types';

// 安全解析數字，過濾 TWSE 常見的 "-" 空值
function safeParseFloat(val: string | undefined): number {
  if (!val || val === '-' || val === '') return NaN;
  return parseFloat(val);
}

// Fetch Taiwan stock price from TWSE，失敗時 fallback 到 Yahoo Finance
async function fetchTWStockPrice(symbol: string): Promise<PriceData | null> {
  // 方案一：TWSE 即時報價 API（設定 5 秒逾時，避免長時間等待）
  try {
    const response = await fetch(
      `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0`,
      { cache: 'no-store', signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();

    if (!data.msgArray || data.msgArray.length === 0) {
      // Try OTC market
      const otcResponse = await fetch(
        `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_${symbol}.tw&json=1&delay=0`,
        { cache: 'no-store', signal: AbortSignal.timeout(5000) }
      );
      const otcData = await otcResponse.json();
      if (otcData.msgArray && otcData.msgArray.length > 0) {
        const result = parseTWStockData(otcData.msgArray[0]);
        if (result.currentPrice > 0) return result;
      }
    } else {
      const result = parseTWStockData(data.msgArray[0]);
      if (result.currentPrice > 0) return result;
    }
  } catch (error) {
    console.error(`TWSE API failed for ${symbol}:`, error);
  }

  // 方案二：Yahoo Finance（台股代碼需加 .TW 或 .TWO）
  console.log(`[TW] Falling back to Yahoo Finance for ${symbol}`);
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    // 先試上市 (.TW)，再試上櫃 (.TWO)
    for (const suffix of ['.TW', '.TWO']) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quote: any = await yahooFinance.quote(`${symbol}${suffix}`);
        if (quote && quote.regularMarketPrice) {
          return {
            symbol,
            name: quote.shortName || quote.longName || symbol,
            market: 'TW',
            currentPrice: quote.regularMarketPrice || 0,
            previousClose: quote.regularMarketPreviousClose || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            high: quote.regularMarketDayHigh || 0,
            low: quote.regularMarketDayLow || 0,
            volume: quote.regularMarketVolume || 0,
            updatedAt: new Date(),
          };
        }
      } catch {
        // 繼續嘗試下一個 suffix
      }
    }
  } catch (error) {
    console.error(`Yahoo Finance fallback also failed for TW:${symbol}:`, error);
  }

  return null;
}

function parseTWStockData(data: Record<string, string>): PriceData {
  // z=成交價, a=最佳五檔賣價(用第一個), b=最佳五檔買價(用第一個), y=昨收
  const tradePrice = safeParseFloat(data.z);
  const askPrice = safeParseFloat(data.a?.split('_')[0]);
  const bidPrice = safeParseFloat(data.b?.split('_')[0]);
  const previousClose = safeParseFloat(data.y) || 0;

  // 優先取成交價，沒有就取買賣中間價，最後才用昨收
  let currentPrice = 0;
  if (!isNaN(tradePrice)) {
    currentPrice = tradePrice;
  } else if (!isNaN(askPrice) && !isNaN(bidPrice)) {
    currentPrice = (askPrice + bidPrice) / 2;
  } else if (!isNaN(askPrice)) {
    currentPrice = askPrice;
  } else if (!isNaN(bidPrice)) {
    currentPrice = bidPrice;
  } else {
    currentPrice = previousClose;
  }

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
    high: safeParseFloat(data.h) || currentPrice,
    low: safeParseFloat(data.l) || currentPrice,
    volume: parseInt(data.v) || 0,
    updatedAt: new Date(),
  };
}

/**
 * 從 Yahoo Finance quote 物件中取得最即時的價格
 * 盤後 (postMarketPrice) → 盤前 (preMarketPrice) → 正規收盤 (regularMarketPrice)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseYahooQuote(quote: any, symbol: string): PriceData {
  const regularPrice = quote.regularMarketPrice || 0;
  const previousClose = quote.regularMarketPreviousClose || 0;

  // 判斷是否有延長交易時段的即時價格
  const postPrice = quote.postMarketPrice || 0;
  const prePrice = quote.preMarketPrice || 0;

  // 優先取盤後價 → 盤前價 → 正規收盤價
  let currentPrice = regularPrice;
  let change = quote.regularMarketChange || 0;
  let changePercent = quote.regularMarketChangePercent || 0;

  if (postPrice > 0) {
    currentPrice = postPrice;
    change = postPrice - previousClose;
    changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
  } else if (prePrice > 0) {
    currentPrice = prePrice;
    change = prePrice - previousClose;
    changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
  }

  return {
    symbol: quote.symbol || symbol,
    name: quote.shortName || quote.longName || symbol,
    market: 'US',
    currentPrice,
    previousClose,
    change,
    changePercent,
    high: quote.regularMarketDayHigh || 0,
    low: quote.regularMarketDayLow || 0,
    volume: quote.regularMarketVolume || 0,
    updatedAt: new Date(),
  };
}

// Fetch US stock price using Yahoo Finance (多層備援)
async function fetchUSStockPrice(symbol: string): Promise<PriceData | null> {
  // 方案一：yahoo-finance2 npm 套件
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(symbol);

    if (quote && quote.regularMarketPrice) {
      return parseYahooQuote(quote, symbol);
    }
  } catch (error) {
    console.error(`yahoo-finance2 quote failed for ${symbol}, trying REST API:`, error);
  }

  // 方案二：Yahoo Finance v7 quote REST API（最直接的即時報價端點）
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const url = `https://${host}/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quote: any = data?.quoteResponse?.result?.[0];
        if (quote && quote.regularMarketPrice) {
          return parseYahooQuote(quote, symbol);
        }
      }
    } catch (error) {
      console.error(`Yahoo v7 quote REST API failed on ${host} for ${symbol}:`, error);
    }
  }

  // 方案三：Yahoo Finance v8 chart REST API（備用，改用 1 分鐘 K 線取即時報價）
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (result) {
        const meta = result.meta;
        const quotes = result.indicators?.quote?.[0];
        const timestamps = result.timestamp;

        // 取最後一筆有效資料
        let lastIdx = timestamps ? timestamps.length - 1 : -1;
        while (lastIdx >= 0 && (!quotes?.close?.[lastIdx] || quotes.close[lastIdx] === null)) {
          lastIdx--;
        }

        // 優先取盤後/盤前價，再取正規收盤價
        const regularPrice = meta?.regularMarketPrice || (lastIdx >= 0 ? quotes?.close?.[lastIdx] : 0) || 0;
        const postPrice = meta?.postMarketPrice || 0;
        const prePrice = meta?.preMarketPrice || 0;
        const previousClose = meta?.chartPreviousClose || meta?.previousClose || 0;

        let currentPrice = regularPrice;
        if (postPrice > 0) {
          currentPrice = postPrice;
        } else if (prePrice > 0) {
          currentPrice = prePrice;
        }

        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        return {
          symbol: meta?.symbol || symbol,
          name: meta?.shortName || meta?.longName || symbol,
          market: 'US',
          currentPrice,
          previousClose,
          change,
          changePercent,
          high: meta?.regularMarketDayHigh || (lastIdx >= 0 ? (quotes?.high?.[lastIdx] || 0) : 0),
          low: meta?.regularMarketDayLow || (lastIdx >= 0 ? (quotes?.low?.[lastIdx] || 0) : 0),
          volume: lastIdx >= 0 ? (quotes?.volume?.[lastIdx] || 0) : 0,
          updatedAt: new Date(),
        };
      }
    }
  } catch (error) {
    console.error(`Yahoo v8 chart REST API also failed for ${symbol}:`, error);
  }

  return null;
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

// 搜尋美股（透過 yahoo-finance2 的 search，備案用 Yahoo REST API）
export async function searchUSStocks(query: string): Promise<{ symbol: string; name: string; market: Market }[]> {
  // 方案一：yahoo-finance2 npm 套件
  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(query);
    if (result?.quotes && result.quotes.length > 0) {
      return result.quotes
        .filter((q: any) => (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') && q.symbol)
        .slice(0, 10)
        .map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          market: 'US' as Market,
        }));
    }
  } catch (error) {
    console.error('yahoo-finance2 search failed, trying REST API:', error);
  }

  // 方案二：直接呼叫 Yahoo Finance REST API
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0&quotesQueryId=tss_match_phrase_query`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.quotes && Array.isArray(data.quotes)) {
        return data.quotes
          .filter((q: any) => (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') && q.symbol)
          .slice(0, 10)
          .map((q: any) => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            market: 'US' as Market,
          }));
      }
    }
  } catch (error) {
    console.error('Yahoo REST API search also failed:', error);
  }

  // 方案三：如果搜尋都失敗，嘗試直接當作股票代碼查報價
  try {
    const price = await fetchStockPrice(query.toUpperCase(), 'US');
    if (price) {
      return [{
        symbol: price.symbol,
        name: price.name,
        market: 'US' as Market,
      }];
    }
  } catch { /* ignore */ }

  return [];
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
