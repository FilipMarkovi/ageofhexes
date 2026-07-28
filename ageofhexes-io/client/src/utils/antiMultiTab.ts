const LOCK_NAME = "territory-io-client";

function showBlockedScreen() {
	document.body.innerHTML = "";
	document.body.style.margin = "0";
	document.body.style.background = "#050816";
	document.body.style.color = "white";
	document.body.style.fontFamily = "system-ui, sans-serif";
	document.body.style.display = "grid";
	document.body.style.placeItems = "center";
	document.body.style.minHeight = "100vh";

	const root = document.createElement("div");
	root.style.maxWidth = "520px";
	root.style.padding = "32px";
	root.style.textAlign = "center";
	root.style.border = "1px solid rgba(255,255,255,0.12)";
	root.style.borderRadius = "16px";
	root.style.background = "rgba(15, 23, 42, 0.9)";
	root.style.boxShadow = "0 20px 80px rgba(0,0,0,0.45)";
	root.innerHTML = `
		<div style="font-size:18px;font-weight:700;letter-spacing:0.4px;margin-bottom:12px;">Game already open in another tab</div>
		<div style="font-size:14px;line-height:1.6;color:#cbd5e1;">
			AgeOfHexes.io only allows one active tab at a time in this browser profile.
			Close the other tab to continue here.
		</div>
	`;

	document.body.appendChild(root);
}

export async function initAntiMultiTab(): Promise<boolean> {
	if (!("locks" in navigator)) {
		return true;
	}

	let resolveDecision!: (acquired: boolean) => void;
	const decision = new Promise<boolean>((resolve) => {
		resolveDecision = resolve;
	});

	void navigator.locks.request(
		LOCK_NAME,
		{ mode: "exclusive", ifAvailable: true },
		async (lock) => {
			if (!lock) {
				resolveDecision(false);
				return;
			}

			resolveDecision(true);

			await new Promise<void>(() => {
				// Keep the lock for the lifetime of this tab.
			});
		}
	);

	const acquired = await decision;

	if (!acquired) {
		showBlockedScreen();
	}

	return acquired;
}
