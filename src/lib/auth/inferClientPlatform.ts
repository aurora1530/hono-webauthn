type ClientPlatform = {
  os: string;
  browser: string;
};

const inferClientPlatform = (headers: Headers): ClientPlatform => {
  // まず Client Hints 系ヘッダーを取得
  const ua = headers.get("user-agent") || "";
  const secChUa = headers.get("sec-ch-ua") || "";
  const secChUaPlatform = headers.get("sec-ch-ua-platform") || "";
  const secChUaMobile = headers.get("sec-ch-ua-mobile") || "";

  let os = "Unknown";
  let browser = "Unknown";

  // ---- OS の推定 ----
  if (secChUaPlatform) {
    const platform = secChUaPlatform.replace(/["']/g, "").toLowerCase();
    if (platform.includes("windows")) os = "Windows";
    else if (platform.includes("mac")) os = "macOS";
    else if (platform.includes("android")) os = "Android";
    else if (platform.includes("ios")) os = "iOS";
    else if (platform.includes("linux")) os = "Linux";
    else os = platform.charAt(0).toUpperCase() + platform.slice(1);
  } else {
    // User-Agent フォールバック
    if (/windows nt/i.test(ua)) os = "Windows";
    else if (/mac os x/i.test(ua)) os = "macOS";
    else if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
    else if (/linux/i.test(ua)) os = "Linux";
  }

  // ---- ブラウザの推定 ----
  if (secChUa) {
    // 例: "Chromium";v="125", "Google Chrome";v="125", "Not.A/Brand";v="24"
    if (/chrome/i.test(secChUa) && !/edg/i.test(secChUa)) browser = "Chrome";
    else if (/edg/i.test(secChUa)) browser = "Edge";
    else if (/safari/i.test(secChUa) && !/chrome/i.test(secChUa)) browser = "Safari";
    else if (/firefox/i.test(secChUa)) browser = "Firefox";
  } else {
    // User-Agent フォールバック
    if (/edg/i.test(ua)) browser = "Edge";
    else if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
    else if (/firefox/i.test(ua)) browser = "Firefox";
  }

  // ---- モバイル補正 ----
  if (secChUaMobile === "?1" || /mobile/i.test(ua)) {
    if (os === "Windows") os = "Windows (Mobile)";
  }

  return { os, browser };
};

export default inferClientPlatform;
