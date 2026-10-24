import { BlockList, isIP } from "node:net";
import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import z from "zod";

export const trustedProxyListSchema = z.array(
  z.union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()]),
);

const normalizeAddress = (value?: string): string | undefined => {
  if (!value || value.includes("%")) return undefined;
  if (isIP(value) === 4) return value;
  if (isIP(value) !== 6) return undefined;

  const address = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = address.match(/^::ffff:([a-f\d]+):([a-f\d]+)$/);
  if (!mapped) return address;
  const high = Number.parseInt(mapped[1], 16);
  const low = Number.parseInt(mapped[2], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
};

export function createClientIpResolver(trustedProxies: string[] = []) {
  const trusted = new BlockList();
  for (const proxy of trustedProxyListSchema.parse(trustedProxies)) {
    const [address, prefix] = proxy.split("/");
    const family = isIP(address) === 4 ? "ipv4" : "ipv6";
    if (prefix === undefined) trusted.addAddress(address, family);
    else trusted.addSubnet(address, Number(prefix), family);
  }

  return (c: Context): string => {
    let address: string | undefined;
    try {
      address = normalizeAddress(getConnInfo(c).remote.address);
    } catch {
      return "unknown";
    }
    if (!address) return "unknown";

    const forwardedFor = c.req.header("x-forwarded-for");
    if (!forwardedFor) return address;
    const hops = forwardedFor.split(",");
    // 接続元から信頼できるプロキシだけをたどり、最初の非信頼アドレスで止める。
    for (let index = hops.length - 1; index >= 0; index--) {
      if (!trusted.check(address, isIP(address) === 4 ? "ipv4" : "ipv6")) break;
      const forwardedAddress = normalizeAddress(hops[index].trim());
      if (!forwardedAddress) break;
      address = forwardedAddress;
    }
    return address;
  };
}
