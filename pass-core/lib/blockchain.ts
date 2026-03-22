import {
  createPublicClient,
  createWalletClient,
  http,
  type Hash,
  type Address,
  toHex,
  keccak256,
  encodePacked,
} from "viem";
import { polygonAmoy, polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import crypto from "crypto";

// ── ABI ─────────────────────────────────────────────────────
// Loaded at build time from compiled contract
import PassCoreABI from "./PassCoreABI.json";

// ── Config ──────────────────────────────────────────────────
const NETWORK = process.env.BLOCKCHAIN_NETWORK || "simulation";
const CONTRACT_ADDRESS = process.env.PASS_CORE_CONTRACT_ADDRESS as Address | undefined;
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY as `0x${string}` | undefined;
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;

const CHAIN = NETWORK === "polygon" ? polygon : polygonAmoy;
const EXPLORER = NETWORK === "polygon"
  ? "https://polygonscan.com"
  : "https://amoy.polygonscan.com";

// ── Clients ─────────────────────────────────────────────────
function getPublicClient() {
  return createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL || undefined),
  });
}

function getWalletClient() {
  if (!PRIVATE_KEY) throw new Error("BLOCKCHAIN_PRIVATE_KEY not set");
  const account = privateKeyToAccount(PRIVATE_KEY);
  return createWalletClient({
    account,
    chain: CHAIN,
    transport: http(RPC_URL || undefined),
  });
}

// ── Hash Generation ─────────────────────────────────────────
export function generateArtworkHash(data: {
  artworkId: string;
  title: string;
  artistId: string;
  macroPhoto?: string;
}): `0x${string}` {
  const payload = `${data.artworkId}|${data.title}|${data.artistId}|${data.macroPhoto || ""}|pass-core-v1`;
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  return `0x${hash}` as `0x${string}`;
}

// ── Certify (Write to Blockchain) ───────────────────────────
export interface CertifyResult {
  txHash: string;
  blockchainHash: string;
  contractAddress: string;
  network: string;
  explorerUrl: string;
  blockNumber?: bigint;
  onChain: boolean;
}

export async function certifyOnChain(data: {
  artworkId: string;
  title: string;
  artistId: string;
  macroPhoto?: string;
}): Promise<CertifyResult> {
  const artworkHash = generateArtworkHash(data);

  // ── Simulation mode ───────────────────────────────────────
  if (NETWORK === "simulation" || !CONTRACT_ADDRESS || !PRIVATE_KEY) {
    const fakeTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
    return {
      txHash: fakeTxHash,
      blockchainHash: artworkHash,
      contractAddress: "simulation",
      network: "simulation",
      explorerUrl: "#",
      onChain: false,
    };
  }

  // ── Real blockchain ───────────────────────────────────────
  try {
    const walletClient = getWalletClient();
    const publicClient = getPublicClient();

    // Send transaction to smart contract
    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: PassCoreABI.abi,
      functionName: "certify",
      args: [
        artworkHash as `0x${string}`,   // bytes32 _hash
        data.artworkId,                   // string _artworkId
        data.macroPhoto || "",            // string _macroFingerprint
      ],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    return {
      txHash,
      blockchainHash: artworkHash,
      contractAddress: CONTRACT_ADDRESS,
      network: NETWORK,
      explorerUrl: `${EXPLORER}/tx/${txHash}`,
      blockNumber: receipt.blockNumber,
      onChain: true,
    };
  } catch (error: any) {
    console.error("Blockchain certification failed:", error.message);
    // Fallback to simulation if blockchain fails
    const fakeTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
    return {
      txHash: fakeTxHash,
      blockchainHash: artworkHash,
      contractAddress: "simulation-fallback",
      network: "simulation-fallback",
      explorerUrl: "#",
      onChain: false,
    };
  }
}

// ── Verify (Read from Blockchain) ───────────────────────────
export interface VerifyResult {
  verified: boolean;
  certifiedBy?: string;
  timestamp?: number;
  artworkId?: string;
  onChain: boolean;
}

export async function verifyOnChain(hash: `0x${string}`): Promise<VerifyResult> {
  if (NETWORK === "simulation" || !CONTRACT_ADDRESS) {
    return { verified: false, onChain: false };
  }

  try {
    const publicClient = getPublicClient();

    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: PassCoreABI.abi,
      functionName: "verify",
      args: [hash],
    }) as [boolean, string, bigint, string];

    const [exists, certifiedBy, timestamp, artworkId] = result;

    return {
      verified: exists,
      certifiedBy,
      timestamp: Number(timestamp),
      artworkId,
      onChain: true,
    };
  } catch (error: any) {
    console.error("Blockchain verification failed:", error.message);
    return { verified: false, onChain: false };
  }
}

// ── Deploy helper (for scripts) ─────────────────────────────
export async function deployContract(): Promise<{ address: Address; txHash: Hash }> {
  if (!PRIVATE_KEY) throw new Error("BLOCKCHAIN_PRIVATE_KEY not set");

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const txHash = await walletClient.deployContract({
    abi: PassCoreABI.abi,
    bytecode: PassCoreABI.bytecode as `0x${string}`,
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  if (!receipt.contractAddress) throw new Error("Deploy failed — no contract address");

  return { address: receipt.contractAddress, txHash };
}

// ── Utilities ───────────────────────────────────────────────
export function getExplorerUrl(txHash: string): string {
  if (NETWORK === "simulation") return "#";
  return `${EXPLORER}/tx/${txHash}`;
}

export function getConfig() {
  return {
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS || null,
    chain: CHAIN.name,
    chainId: CHAIN.id,
    explorerBase: EXPLORER,
    isConfigured: !!(CONTRACT_ADDRESS && PRIVATE_KEY),
    isSimulation: NETWORK === "simulation" || !CONTRACT_ADDRESS || !PRIVATE_KEY,
  };
}
