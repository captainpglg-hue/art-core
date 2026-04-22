import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import type { PassCore, PassCoreStatus } from "@/types";

// ============================================================
// Pass-Core — Blockchain Simulation
// Ready for production upgrade via viem (Polygon / Base)
// ============================================================

export const CHAIN_CONFIG = {
  network: process.env.BLOCKCHAIN_NETWORK ?? "simulation",
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL ?? "https://polygon-rpc.com",
  chainId: Number(process.env.BLOCKCHAIN_CHAIN_ID ?? 137),
  contractAddress: process.env.PASS_CORE_CONTRACT_ADDRESS ?? "",
  explorerUrl: process.env.BLOCKCHAIN_EXPLORER_URL ?? "https://polygonscan.com",
} as const;

// ── Hashing ───────────────────────────────────────────────────

export interface ArtworkHashInput {
  artworkId: string;
  title: string;
  artistId: string;
  createdAt: string;
  imageUrl: string;
  dimensions?: string;
  medium?: string;
  edition?: string;
}

export const generateArtworkHash = (data: ArtworkHashInput): string => {
  // Deterministic payload — same data always yields same hash
  const normalized = {
    artwork_id: data.artworkId,
    title: data.title.trim(),
    artist_id: data.artistId,
    created_at: data.createdAt,
    image_url: data.imageUrl,
    dimensions: data.dimensions ?? null,
    medium: data.medium ?? null,
    edition: data.edition ?? null,
    protocol: "pass-core-v1",
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized), "utf8")
    .digest("hex");
};

// ── Pass-Core Generation ──────────────────────────────────────

export interface PassCoreGenerateInput {
  artworkId: string;
  title: string;
  artistId: string;
  ownerId: string;
  createdAt: string;
  imageUrl: string;
  dimensions?: string;
  medium?: string;
  edition?: string;
}

export const generatePassCore = (
  input: PassCoreGenerateInput
): Omit<PassCore, "id" | "artwork" | "current_owner" | "verification_url" | "qr_code_url"> => {
  const hash = generateArtworkHash(input);
  const passId = `PASS-${Date.now()}-${uuidv4().split("-")[0].toUpperCase()}`;

  // Simulated blockchain data (replace with viem calls in production)
  const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  const blockNumber = Math.floor(Math.random() * 5_000_000) + 45_000_000;

  return {
    artwork_id: input.artworkId,
    hash,
    tx_hash: txHash,
    block_number: blockNumber,
    network: CHAIN_CONFIG.network,
    contract_address: CHAIN_CONFIG.contractAddress || null,
    token_id: passId,
    current_owner_id: input.ownerId,
    previous_owner_id: null,
    issued_by: "art-core-ltd",
    status: "active" as PassCoreStatus,
    locked_at: null,
    transferred_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

// ── Transfer Logic ─────────────────────────────────────────────
// Pass-Core belongs to Art-core LTD — NOT to the user.
// On ownership transfer: current pass LOCKS, new pass is issued.

export interface TransferResult {
  lockedPass: {
    status: PassCoreStatus;
    locked_at: string;
    previous_owner_id: string;
  };
  newTxHash: string;
}

export const initiatePassCoreTransfer = (
  currentOwnerId: string
): TransferResult => {
  const newTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  return {
    lockedPass: {
      status: "locked",
      locked_at: new Date().toISOString(),
      previous_owner_id: currentOwnerId,
    },
    newTxHash,
  };
};

export const completePassCoreTransfer = (): {
  status: PassCoreStatus;
  transferred_at: string;
  updated_at: string;
} => ({
  status: "transferred",
  transferred_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// ── Verification ───────────────────────────────────────────────

export const verifyPassCoreHash = (
  storedHash: string,
  artworkData: ArtworkHashInput
): boolean => {
  const expectedHash = generateArtworkHash(artworkData);
  return crypto.timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(expectedHash, "hex")
  );
};

export const getExplorerUrl = (txHash: string): string => {
  if (CHAIN_CONFIG.network === "simulation") return "#";
  return `${CHAIN_CONFIG.explorerUrl}/tx/${txHash}`;
};

// ── Production upgrade path (viem) ────────────────────────────
// Uncomment and configure when deploying to real chain:
//
// import { createPublicClient, createWalletClient, http } from "viem";
// import { polygon } from "viem/chains";
// import { privateKeyToAccount } from "viem/accounts";
//
// export const publicClient = createPublicClient({
//   chain: polygon,
//   transport: http(CHAIN_CONFIG.rpcUrl),
// });
//
// export const walletClient = createWalletClient({
//   account: privateKeyToAccount(process.env.BLOCKCHAIN_PRIVATE_KEY as `0x${string}`),
//   chain: polygon,
//   transport: http(CHAIN_CONFIG.rpcUrl),
// });
