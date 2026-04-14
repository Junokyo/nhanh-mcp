import axios from "axios";

const BASE_URL = "https://pos.open.nhanh.vn/v3.0";
const RATE_LIMIT_DELAY = 250; // ms between requests

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convert dd/mm/yyyy to unix timestamp (start of day in UTC+7)
export function dateToTimestamp(dateStr) {
  const [d, m, y] = dateStr.split("/").map(Number);
  // Create date in UTC+7 (Vietnam timezone)
  const date = new Date(Date.UTC(y, m - 1, d, -7, 0, 0));
  return Math.floor(date.getTime() / 1000);
}

// End of day timestamp
export function dateToEndTimestamp(dateStr) {
  return dateToTimestamp(dateStr) + 86400 - 1;
}

export async function callNhanhApi(endpoint, body = {}, options = {}) {
  const {
    accessToken = process.env.NHANH_ACCESS_TOKEN,
    appId = process.env.NHANH_APP_ID,
    businessId = process.env.NHANH_BUSINESS_ID,
  } = options;

  const url = `${BASE_URL}${endpoint}?appId=${appId}&businessId=${businessId}`;

  const response = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    timeout: 30000,
  });

  if (response.data.code !== 1) {
    const messages = Array.isArray(response.data.messages)
      ? response.data.messages.join(", ")
      : response.data.messages || "No message";
    throw new Error(
      `Nhanh API error: ${response.data.errorCode || "UNKNOWN"} - ${messages}`
    );
  }

  return response.data;
}

export async function callNhanhApiPaginated(
  endpoint,
  body = {},
  options = {}
) {
  const { maxPages = 10, size = 100, ...apiOptions } = options;
  const allData = [];
  let paginatorNext = null;
  let page = 0;

  while (page < maxPages) {
    const requestBody = { ...body };

    // v3 pagination: paginator.size + paginator.next
    requestBody.paginator = { size };
    if (paginatorNext) {
      requestBody.paginator.next = paginatorNext;
    }

    const result = await callNhanhApi(endpoint, requestBody, apiOptions);

    const data = result.data;
    if (data) {
      if (Array.isArray(data)) {
        allData.push(...data);
      } else if (typeof data === "object") {
        const entries = Object.values(data);
        if (entries.length > 0 && typeof entries[0] === "object") {
          allData.push(...entries);
        } else {
          allData.push(data);
        }
      }
    }

    // Check for next page — copy next object as-is
    if (result.paginator && result.paginator.next) {
      paginatorNext = result.paginator.next;
      page++;
      await sleep(RATE_LIMIT_DELAY);
    } else {
      break;
    }
  }

  return allData;
}
