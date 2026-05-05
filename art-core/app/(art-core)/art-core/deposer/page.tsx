import { redirect } from "next/navigation";

const PASS_CORE_URL = process.env.NEXT_PUBLIC_PASS_CORE_URL || "https://pass-core.app";

export default function DeposerRedirect() {
  redirect(`${PASS_CORE_URL}/pass-core/deposer`);
}
