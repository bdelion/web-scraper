# Mock Examples

## Axios Mock Adapter Patterns

### Basic Mock Setup

```javascript
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

const mock = new MockAdapter(axios);

describe("My Tests", () => {
  beforeEach(() => {
    mock.reset(); // Clear all mocks before each test
  });

  afterEach(() => {
    mock.reset();
  });
});
```

### Mock GET Request

```javascript
it("should mock successful GET request", async () => {
  const mockResponse = {
    id: 123,
    name: "Paris",
    temperature: 20.5
  };

  mock.onGet("https://api.example.com/weather/123").reply(200, mockResponse);

  const response = await axios.get("https://api.example.com/weather/123");

  expect(response.data.id).toBe(123);
  expect(response.data.temperature).toBe(20.5);
});
```

### Mock with URL Pattern

```javascript
it("should mock requests matching pattern", async () => {
  mock.onGet(/\/weather\/\d+/).reply(200, { temp: 20 });

  const response1 = await axios.get("/weather/1");
  const response2 = await axios.get("/weather/999");

  expect(response1.data.temp).toBe(20);
  expect(response2.data.temp).toBe(20);
});
```

### Mock with Query Parameters

```javascript
it("should match query parameters", async () => {
  mock.onGet("/search", {
    params: { q: "Paris", limit: 10 }
  }).reply(200, { results: [] });

  const response = await axios.get("/search", {
    params: { q: "Paris", limit: 10 }
  });

  expect(response.data.results).toEqual([]);
});
```

## Error Response Mocks

### HTTP Error Status Codes

```javascript
it("should handle 404 Not Found", async () => {
  mock.onGet("/weather/notfound").reply(404, { error: "Not found" });

  try {
    await axios.get("/weather/notfound");
  } catch (error) {
    expect(error.response.status).toBe(404);
  }
});

it("should handle 403 Forbidden", async () => {
  mock.onGet("/restricted").reply(403, { error: "Access denied" });

  await expect(axios.get("/restricted")).rejects.toThrow();
});

it("should handle 500 Server Error", async () => {
  mock.onGet("/error").reply(500, { error: "Internal server error" });

  await expect(axios.get("/error")).rejects.toThrow();
});

it("should handle 429 Rate Limited", async () => {
  mock.onGet("/api").reply(429, { error: "Rate limited" }, {
    "retry-after": "60"
  });

  await expect(axios.get("/api")).rejects.toThrow();
});
```

### Network Errors

```javascript
it("should handle network error", async () => {
  mock.onGet("/api").networkError();

  await expect(axios.get("/api")).rejects.toThrow();
});

it("should handle timeout", async () => {
  mock.onGet("/api").timeoutOnce();

  await expect(axios.get("/api")).rejects.toThrow();
});

it("should handle connection refused", async () => {
  mock.onGet(/api/).networkErrorOnce();

  await expect(axios.get("/api/data")).rejects.toThrow();
});
```

## Multiple Response Mocks

### Sequential Responses

```javascript
it("should return different responses on consecutive calls", async () => {
  mock.onGet("/counter").replyOnce(200, { count: 1 });
  mock.onGet("/counter").replyOnce(200, { count: 2 });
  mock.onGet("/counter").reply(200, { count: 3 }); // Default for remaining calls

  const res1 = await axios.get("/counter");
  const res2 = await axios.get("/counter");
  const res3 = await axios.get("/counter");

  expect(res1.data.count).toBe(1);
  expect(res2.data.count).toBe(2);
  expect(res3.data.count).toBe(3);
});
```

### Different Responses Based on Parameters

```javascript
it("should vary responses based on params", async () => {
  mock.onGet("/weather/Paris").reply(200, { temp: 20 });
  mock.onGet("/weather/Lyon").reply(200, { temp: 18 });
  mock.onGet(/\/weather\/.*/).reply(200, { temp: 15 }); // Default

  const paris = await axios.get("/weather/Paris");
  const lyon = await axios.get("/weather/Lyon");
  const other = await axios.get("/weather/Unknown");

  expect(paris.data.temp).toBe(20);
  expect(lyon.data.temp).toBe(18);
  expect(other.data.temp).toBe(15);
});
```

## Dynamic Mock Responses

### Response Handler Function

```javascript
it("should use handler function for dynamic responses", async () => {
  mock.onGet("/data").reply((config) => {
    // Access request details
    const query = config.params.search;

    if (query === "valid") {
      return [200, { found: true }];
    } else {
      return [400, { found: false }];
    }
  });

  const valid = await axios.get("/data", { params: { search: "valid" } });
  expect(valid.data.found).toBe(true);

  try {
    await axios.get("/data", { params: { search: "invalid" } });
  } catch (error) {
    expect(error.response.status).toBe(400);
  }
});
```

### Track Mock Calls

```javascript
it("should track how many times mock was called", async () => {
  mock.onGet("/api/users").reply(200, { users: [] });

  await axios.get("/api/users");
  await axios.get("/api/users");
  await axios.get("/api/users");

  // Get history of all GET requests
  expect(mock.history.get).toHaveLength(3);
  expect(mock.history.get[0].url).toBe("/api/users");
});

it("should verify request headers", async () => {
  mock.onGet("/api").reply(200, { ok: true });

  await axios.get("/api", {
    headers: { "X-Custom": "value" }
  });

  const request = mock.history.get[0];
  expect(request.headers["X-Custom"]).toBe("value");
});
```

## Mock-fs for File Operations

### Basic File Mock

```javascript
const mockFs = require("mock-fs");
const fs = require("fs");

describe("File Operations", () => {
  beforeEach(() => {
    mockFs({
      "src/": {
        "data.json": '{"name":"test"}',
        "config/": {
          "settings.json": '{"debug":true}'
        }
      }
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should read file", () => {
    const content = fs.readFileSync("src/data.json", "utf8");
    expect(content).toContain("test");
  });

  it("should list directory", () => {
    const files = fs.readdirSync("src/");
    expect(files).toContain("data.json");
    expect(files).toContain("config");
  });
});
```

### Mock Directory Structure

```javascript
mockFs({
  "project/": {
    "src/": {
      "index.js": "console.log('hello');",
      "utils/": {
        "helpers.js": "module.exports = {};"
      }
    },
    "tests/": {
      "index.test.js": "test('ok', () => {});"
    },
    "package.json": '{"name":"project"}'
  }
});
```

### Mock File Write Operations

```javascript
it("should write file", () => {
  mockFs({
    "output/": {}
  });

  fs.writeFileSync("output/result.txt", "success");

  expect(fs.existsSync("output/result.txt")).toBe(true);
  const content = fs.readFileSync("output/result.txt", "utf8");
  expect(content).toBe("success");

  mockFs.restore();
});
```

## Combined HTTP and File Mocks

### Fetch Data and Save to File

```javascript
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const mockFs = require("mock-fs");
const fs = require("fs");

describe("Fetch and Save Pipeline", () => {
  beforeEach(() => {
    const mock = new MockAdapter(axios);
    mock.onGet("/api/weather").reply(200, {
      temperature: 20,
      humidity: 65
    });

    mockFs({
      "output/": {}
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("should fetch data and save to file", async () => {
    // Fetch data
    const response = await axios.get("/api/weather");

    // Save to file
    fs.writeFileSync(
      "output/weather.json",
      JSON.stringify(response.data)
    );

    // Verify
    const saved = JSON.parse(
      fs.readFileSync("output/weather.json", "utf8")
    );
    expect(saved.temperature).toBe(20);
  });
});
```

## Advanced Patterns

### Mock with Delay

```javascript
it("should handle mock with delay", async () => {
  mock.onGet("/slow").reply(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([200, { data: "delayed" }]);
      }, 100);
    });
  });

  const start = Date.now();
  const response = await axios.get("/slow");
  const duration = Date.now() - start;

  expect(response.data.data).toBe("delayed");
  expect(duration).toBeGreaterThanOrEqual(100);
});
```

### Mock Post Request

```javascript
it("should mock POST request", async () => {
  mock.onPost("/api/create").reply((config) => {
    const data = JSON.parse(config.data);
    return [201, { id: 1, ...data }];
  });

  const response = await axios.post("/api/create", {
    name: "test",
    value: 123
  });

  expect(response.status).toBe(201);
  expect(response.data.id).toBe(1);
  expect(response.data.name).toBe("test");
});
```

### Mock Retry Logic

```javascript
it("should retry on failure then succeed", async () => {
  let attempts = 0;

  mock.onGet("/retry").reply(() => {
    attempts++;
    if (attempts < 3) {
      return [500, { error: "Server error" }];
    }
    return [200, { success: true }];
  });

  // Test with retry logic
  let result;
  for (let i = 0; i < 3; i++) {
    try {
      result = await axios.get("/retry");
      break;
    } catch (error) {
      if (i === 2) throw error;
    }
  }

  expect(result.data.success).toBe(true);
  expect(attempts).toBe(3);
});
```
