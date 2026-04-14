import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  callNhanhApi,
  callNhanhApiPaginated,
  dateToTimestamp,
  dateToEndTimestamp,
} from "./nhanh-client.js";

// Nhanh.vn v3 order status codes
const ORDER_STATUS = {
  42: "Dang dong goi",
  43: "Cho thu gom",
  40: "Da dong goi",
  54: "Don moi",
  55: "Dang xac nhan",
  56: "Da xac nhan",
  57: "Cho khach xac nhan",
  58: "Hang van chuyen huy",
  59: "Dang chuyen",
  60: "Thanh cong",
  61: "That bai",
  63: "Khach huy",
  64: "He thong huy",
  68: "Het hang",
  71: "Dang chuyen hoan",
  72: "Da chuyen hoan",
  73: "Doi kho xuat hang",
  74: "Xac nhan hoan",
};
const SUCCESS_STATUSES = [60]; // Thanh cong
const ACTIVE_STATUSES = [40, 42, 43, 54, 55, 56, 57, 59]; // Chua hoan thanh

const server = new McpServer({
  name: "nhanh-vn",
  version: "1.0.0",
});

// Tool 1: Check token
server.tool(
  "check_token",
  "Kiem tra access token con han hay khong",
  {},
  async () => {
    try {
      const result = await callNhanhApi("/app/checkaccesstoken", {});
      return {
        content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Tool 2: Get orders
server.tool(
  "get_orders",
  "Lay danh sach don hang theo ngay, trang thai. Date format: dd/mm/yyyy",
  {
    fromDate: z.string().optional().describe("Ngay bat dau, dd/mm/yyyy"),
    toDate: z.string().optional().describe("Ngay ket thuc, dd/mm/yyyy"),
    statuses: z
      .array(z.number())
      .optional()
      .describe("Mang trang thai: 54=Moi, 42=Dong goi, 59=Dang chuyen, 60=Thanh cong, 63=Khach huy, 61=That bai. VD: [60]"),
    maxPages: z.number().optional().describe("So trang toi da (mac dinh 5)"),
  },
  async ({ fromDate, toDate, statuses, maxPages }) => {
    try {
      const filters = {};
      if (fromDate) filters.createdAtFrom = dateToTimestamp(fromDate);
      if (toDate) filters.createdAtTo = dateToEndTimestamp(toDate);
      if (statuses) filters.statuses = statuses;

      const orders = await callNhanhApiPaginated(
        "/order/list",
        { filters },
        { maxPages: maxPages || 5, size: 50 }
      );

      return {
        content: [
          {
            type: "text",
            text: `Tim thay ${orders.length} don hang.\n\n${JSON.stringify(
              orders.slice(0, 20),
              null,
              2
            )}${orders.length > 20 ? `\n\n... va ${orders.length - 20} don khac` : ""}`,
          },
        ],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Tool 3: Get revenue report
server.tool(
  "get_revenue_report",
  "Tinh doanh thu theo khoang thoi gian (tu don hang thanh cong). Date format: dd/mm/yyyy",
  {
    fromDate: z.string().describe("Ngay bat dau, dd/mm/yyyy"),
    toDate: z.string().describe("Ngay ket thuc, dd/mm/yyyy"),
  },
  async ({ fromDate, toDate }) => {
    try {
      const filters = {
        createdAtFrom: dateToTimestamp(fromDate),
        createdAtTo: dateToEndTimestamp(toDate),
      };

      const orders = await callNhanhApiPaginated(
        "/order/list",
        { filters },
        { maxPages: 20, size: 100 }
      );

      let totalRevenue = 0;
      let successRevenue = 0;
      let successCount = 0;
      const statusBreakdown = {};
      const dailyRevenue = {};

      for (const order of orders) {
        const status = order.info?.status || 0;
        const statusName = ORDER_STATUS[status] || `Status ${status}`;
        statusBreakdown[statusName] = (statusBreakdown[statusName] || 0) + 1;

        // Sum product prices * quantity
        let orderTotal = 0;
        const products = order.products || [];
        for (const p of products) {
          orderTotal += parseFloat(p.price || 0) * parseInt(p.quantity || 1);
        }
        totalRevenue += orderTotal;

        if (SUCCESS_STATUSES.includes(status)) {
          successRevenue += orderTotal;
          successCount++;
        }

        const createdAt = order.info?.createdAt || 0;
        const day = createdAt
          ? new Date(createdAt * 1000).toLocaleDateString("vi-VN")
          : "unknown";
        if (!dailyRevenue[day]) dailyRevenue[day] = 0;
        dailyRevenue[day] += orderTotal;
      }

      const report = {
        period: `${fromDate} - ${toDate}`,
        totalOrders: orders.length,
        totalRevenue: totalRevenue.toLocaleString("vi-VN") + " VND",
        successOrders: successCount,
        successRevenue: successRevenue.toLocaleString("vi-VN") + " VND",
        statusBreakdown,
        dailyBreakdown: Object.entries(dailyRevenue)
          .sort()
          .map(([date, amount]) => ({
            date,
            revenue: amount.toLocaleString("vi-VN") + " VND",
          })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Tool 4: Get top products
server.tool(
  "get_top_products",
  "Top san pham ban chay nhat theo khoang thoi gian. Date format: dd/mm/yyyy",
  {
    fromDate: z.string().describe("Ngay bat dau, dd/mm/yyyy"),
    toDate: z.string().describe("Ngay ket thuc, dd/mm/yyyy"),
    top: z.number().optional().describe("So luong top (mac dinh 10)"),
  },
  async ({ fromDate, toDate, top }) => {
    try {
      const filters = {
        createdAtFrom: dateToTimestamp(fromDate),
        createdAtTo: dateToEndTimestamp(toDate),
      };

      const orders = await callNhanhApiPaginated(
        "/order/list",
        { filters },
        { maxPages: 20, size: 100 }
      );

      const productMap = {};

      for (const order of orders) {
        const products = order.products || {};
        for (const [, product] of Object.entries(products)) {
          const name =
            product.productName || product.name || `ID:${product.productId}`;
          if (!productMap[name]) {
            productMap[name] = { name, quantity: 0, revenue: 0 };
          }
          productMap[name].quantity += parseInt(product.quantity || 1);
          productMap[name].revenue +=
            parseFloat(product.price || 0) * parseInt(product.quantity || 1);
        }
      }

      const sorted = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, top || 10)
        .map((p, i) => ({
          rank: i + 1,
          name: p.name,
          quantity: p.quantity,
          revenue: p.revenue.toLocaleString("vi-VN") + " VND",
        }));

      return {
        content: [
          {
            type: "text",
            text: `Top ${top || 10} san pham ban chay (${fromDate} - ${toDate}):\n\n${JSON.stringify(sorted, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Tool 5: Get inventory
server.tool(
  "get_inventory",
  "Xem ton kho san pham hien tai",
  {
    keyword: z.string().optional().describe("Tu khoa tim kiem san pham"),
    categoryId: z.number().optional().describe("ID danh muc san pham"),
    maxPages: z.number().optional().describe("So trang toi da (mac dinh 3)"),
  },
  async ({ keyword, categoryId, maxPages }) => {
    try {
      const filters = {};
      if (keyword) filters.name = keyword;
      if (categoryId) filters.categoryId = categoryId;

      const products = await callNhanhApiPaginated(
        "/product/list",
        { filters },
        { maxPages: maxPages || 3, size: 50 }
      );

      const inventory = products.map((p) => ({
        id: p.idNhanh || p.id,
        name: p.name,
        code: p.code || "",
        inventory: p.inventory || p.remain || 0,
        price: p.price
          ? parseFloat(p.price).toLocaleString("vi-VN") + " VND"
          : "N/A",
      }));

      return {
        content: [
          {
            type: "text",
            text: `Tim thay ${inventory.length} san pham.\n\n${JSON.stringify(
              inventory.slice(0, 30),
              null,
              2
            )}${inventory.length > 30 ? `\n\n... va ${inventory.length - 30} san pham khac` : ""}`,
          },
        ],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Tool 6: Get customers
server.tool(
  "get_customers",
  "Tim kiem khach hang",
  {
    keyword: z.string().optional().describe("Tu khoa: ten, sdt, email"),
    maxPages: z.number().optional().describe("So trang toi da (mac dinh 3)"),
  },
  async ({ keyword, maxPages }) => {
    try {
      const body = {};
      if (keyword) body.name = keyword;

      const customers = await callNhanhApiPaginated(
        "/customer/search",
        body,
        { maxPages: maxPages || 3, size: 50 }
      );

      const list = customers.map((c) => ({
        id: c.id || c.idNhanh,
        name: c.name || c.customerName,
        phone: c.mobile || c.phone || "",
        email: c.email || "",
        address: c.address || "",
        totalOrders: c.totalOrder || 0,
        totalMoney: c.totalMoney
          ? parseFloat(c.totalMoney).toLocaleString("vi-VN") + " VND"
          : "N/A",
      }));

      return {
        content: [
          {
            type: "text",
            text: `Tim thay ${list.length} khach hang.\n\n${JSON.stringify(
              list.slice(0, 20),
              null,
              2
            )}${list.length > 20 ? `\n\n... va ${list.length - 20} khach khac` : ""}`,
          },
        ],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nhanh.vn MCP Server running on stdio");
}

main().catch(console.error);
