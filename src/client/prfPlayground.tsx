import { webauthnClient } from "./lib/rpc/webauthnClient.js";

type PrfEntry = {
  id: string;
  passkeyId: string;
  passkeyName: string;
  label: string | null;
  ciphertext: string;
  iv: string;
  tag: string;
  associatedData: string | null;
  version: number;
  createdAt: string;
  prfInput: string;
};

const playgroundRoot = document.getElementById("prf-playground-root");

if (playgroundRoot) {
  const prfElements = {
    select: document.getElementById("prf-passkey-select") as HTMLSelectElement | null,
    labelInput: document.getElementById("prf-label-input") as HTMLInputElement | null,
    plaintextInput: document.getElementById("prf-plaintext-input") as HTMLTextAreaElement | null,
    encryptButton: document.getElementById("prf-encrypt-button") as HTMLButtonElement | null,
    refreshButton: document.getElementById("prf-refresh-button") as HTMLButtonElement | null,
    statusMessage: document.getElementById("prf-status-message") as HTMLParagraphElement | null,
    latestOutput: document.getElementById("prf-latest-output") as HTMLDivElement | null,
    outputContent: document.getElementById("prf-output-content") as HTMLDivElement | null,
    entriesContainer: document.getElementById("prf-entries-container") as HTMLDivElement | null,
    entriesCount: document.getElementById("prf-entries-count") as HTMLSpanElement | null,
  };

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const AES_GCM_TAG_BYTE_LENGTH = 16;
  const PRF_INPUT_BYTE_LENGTH = 32;

  const entryClassNames = {
    card: prfElements.entriesContainer?.dataset.entryCardClass ?? "",
    meta: prfElements.entriesContainer?.dataset.entryMetaClass ?? "",
    actions: prfElements.entriesContainer?.dataset.entryActionsClass ?? "",
  };

  const prfState = {
    entries: [] as PrfEntry[],
    loading: false,
  };

  const setPrfStatus = (message: string, isError = false) => {
    if (!prfElements.statusMessage) return;
    prfElements.statusMessage.textContent = message;
    if (isError) {
      prfElements.statusMessage.classList.add("error");
    } else {
      prfElements.statusMessage.classList.remove("error");
    }
  };

  const togglePrfBusy = (isBusy: boolean) => {
    prfState.loading = isBusy;
    if (prfElements.encryptButton) {
      prfElements.encryptButton.disabled = isBusy;
    }
    if (prfElements.refreshButton) {
      prfElements.refreshButton.disabled = isBusy;
    }
  };

  const toBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  };

  const fromBase64 = (value: string): Uint8Array => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const concatBytes = (...arrays: Uint8Array[]): Uint8Array => {
    const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
      combined.set(arr, offset);
      offset += arr.length;
    }
    return combined;
  };

  const renderLatestOutput = (title: string, rows: Array<{ label: string; value: string }>) => {
    if (!prfElements.latestOutput || !prfElements.outputContent) return;
    const heading = prfElements.latestOutput.querySelector("h4");
    if (heading) {
      heading.textContent = title;
    }
    prfElements.outputContent.innerHTML = "";
    rows.forEach((row) => {
      const wrapper = document.createElement("div");
      const labelEl = document.createElement("p");
      labelEl.style.margin = "0 0 4px";
      labelEl.style.fontWeight = "600";
      labelEl.textContent = row.label;
      const valueEl = document.createElement("code");
      valueEl.textContent = row.value;
      wrapper.appendChild(labelEl);
      wrapper.appendChild(valueEl);
      prfElements.outputContent?.appendChild(wrapper);
    });
    prfElements.latestOutput.hidden = false;
  };

  const getSelectedPasskey = () => {
    if (!prfElements.select) return null;
    const value = prfElements.select.value;
    if (!value) return null;
    const selectedOption = prfElements.select.selectedOptions[0];
    return {
      id: value,
      name: selectedOption?.dataset.passkeyName ?? selectedOption?.textContent ?? value,
    };
  };

  const randomBase64 = (byteLength: number): { bytes: Uint8Array; base64: string } => {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return { bytes, base64: toBase64(bytes) };
  };

  const deriveAesArtifacts = async (prfBytes: Uint8Array, salt: Uint8Array) => {
    const hkdfKey = await crypto.subtle.importKey("raw", prfBytes as unknown as BufferSource, "HKDF", false, [
      "deriveBits",
    ]);
    const deriveBits = async (infoLabel: string, bitLength: number) =>
      crypto.subtle.deriveBits(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: salt as unknown as BufferSource,
          info: encoder.encode(infoLabel),
        },
        hkdfKey,
        bitLength,
      );
    const keyBits = await deriveBits("prf-demo-aes-key-v1", 128);
    const ivBits = await deriveBits("prf-demo-aes-iv-v1", 96);
    const aesKey = await crypto.subtle.importKey("raw", keyBits, { name: "AES-GCM", length: 128 }, false, [
      "encrypt",
      "decrypt",
    ]);
    return {
      aesKey,
      iv: new Uint8Array(ivBits),
    };
  };

  const requestPrfEvaluation = async (
    passkeyId: string,
    prfInputBase64: string,
  ): Promise<{ credential: PublicKeyCredential; prfBytes: Uint8Array }> => {
    const generateRes = await webauthnClient.prf.assertion.generate.$post({
      json: { passkeyId, prfInput: prfInputBase64 },
    });
    if (!generateRes.ok) {
      const error = (await generateRes.json()).error ?? "PRFオプションの取得に失敗しました";
      throw new Error(error);
    }
    const optionsJSON = await generateRes.json();
    const options = PublicKeyCredential.parseRequestOptionsFromJSON(optionsJSON);
    const credential = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential;
    const verifyRes = await webauthnClient.prf.assertion.verify.$post({
      json: { body: credential },
    });
    if (!verifyRes.ok) {
      const error = (await verifyRes.json()).error ?? "PRF認証の検証に失敗しました";
      throw new Error(error);
    }
    const prfResult = credential.getClientExtensionResults().prf?.results?.first as ArrayBuffer | undefined;
    if (!prfResult) {
      throw new Error("この環境ではPRF拡張を利用できません");
    }
    return {
      credential,
      prfBytes: new Uint8Array(prfResult),
    };
  };

  const renderEntries = () => {
    if (!prfElements.entriesContainer) return;
    prfElements.entriesContainer.innerHTML = "";
    if (prfState.entries.length === 0) {
      const emptyText = prfElements.entriesContainer.dataset.empty || "暗号化済みのデータはありません";
      const p = document.createElement("p");
      p.textContent = emptyText;
      prfElements.entriesContainer.appendChild(p);
      if (prfElements.entriesCount) {
        prfElements.entriesCount.textContent = "0件";
      }
      return;
    }

    prfState.entries.forEach((entry) => {
      const card = document.createElement("article");
      if (entryClassNames.card) {
        card.className = entryClassNames.card;
      }

      const title = document.createElement("div");
      title.style.display = "flex";
      title.style.flexDirection = "column";
      const label = document.createElement("strong");
      label.textContent = entry.label || "(ラベル未設定)";
      const metaLine = document.createElement("span");
      metaLine.style.fontSize = "12px";
      metaLine.style.color = "#475569";
      metaLine.textContent = `${entry.passkeyName} • ${new Date(entry.createdAt).toLocaleString()}`;
      title.appendChild(label);
      title.appendChild(metaLine);
      card.appendChild(title);

      const meta = document.createElement("div");
      if (entryClassNames.meta) {
        meta.className = entryClassNames.meta;
      }
      const metaItems: Array<{ label: string; value: string }> = [
        { label: "Entry ID", value: entry.id },
        { label: "Ciphertext", value: entry.ciphertext },
        { label: "IV", value: entry.iv },
        { label: "Tag", value: entry.tag },
        { label: "PRF Input", value: entry.prfInput },
      ];
      if (entry.associatedData) {
        metaItems.push({ label: "Associated Data", value: entry.associatedData });
      }
      metaItems.forEach((item) => {
        const block = document.createElement("div");
        const titleEl = document.createElement("span");
        titleEl.style.fontWeight = "600";
        titleEl.textContent = item.label;
        const code = document.createElement("code");
        code.textContent = item.value;
        block.appendChild(titleEl);
        block.appendChild(code);
        meta.appendChild(block);
      });
      card.appendChild(meta);

      const actions = document.createElement("div");
      if (entryClassNames.actions) {
        actions.className = entryClassNames.actions;
      }

      const decryptBtn = document.createElement("button");
      decryptBtn.type = "button";
      decryptBtn.textContent = "復号";
      decryptBtn.addEventListener("click", () => handleDecrypt(entry));

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = "コピー";
      copyBtn.addEventListener("click", async () => {
        if (!navigator.clipboard) {
          setPrfStatus("クリップボードAPIがサポートされていません。", true);
          return;
        }
        await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
        setPrfStatus("暗号化データをクリップボードにコピーしました。", false);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.textContent = "削除";
      deleteBtn.addEventListener("click", () => handleDeleteEntry(entry));

      actions.appendChild(decryptBtn);
      actions.appendChild(copyBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(actions);

      prfElements.entriesContainer?.appendChild(card);
    });

    if (prfElements.entriesCount) {
      prfElements.entriesCount.textContent = `${prfState.entries.length}件`;
    }
  };

  const loadEntries = async () => {
    if (!prfElements.entriesContainer) return;
    togglePrfBusy(true);
    setPrfStatus("暗号化済みデータを取得しています...");
    try {
      const res = await webauthnClient.prf.entries.$get();
      if (!res.ok) {
        const error = (await res.json()).error ?? "一覧の取得に失敗しました";
        throw new Error(error);
      }
      const data = await res.json();
      prfState.entries = data.entries as PrfEntry[];
      renderEntries();
    } catch (error) {
      console.error(error);
      setPrfStatus(error instanceof Error ? error.message : "一覧の取得中にエラーが発生しました", true);
    } finally {
      togglePrfBusy(false);
      setPrfStatus("暗号化済みデータの取得が完了しました。", false);
    }
  };

  const handleDeleteEntry = async (entry: PrfEntry) => {
    if (!confirm("この暗号化データを削除しますか？")) {
      return;
    }
    togglePrfBusy(true);
    setPrfStatus("暗号化データを削除しています...");
    try {
      const res = await fetch(`/auth/webauthn/prf/entries/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = (await res.json()).error ?? "暗号化データの削除に失敗しました";
        throw new Error(error);
      }
      prfState.entries = prfState.entries.filter((e) => e.id !== entry.id);
      renderEntries();
      setPrfStatus("暗号化データを削除しました。", false);
    } catch (error) {
      console.error(error);
      setPrfStatus(error instanceof Error ? error.message : "削除に失敗しました", true);
    } finally {
      togglePrfBusy(false);
    }
  };

  const handleEncrypt = async () => {
    if (!prfElements.plaintextInput || !prfElements.encryptButton) {
      return;
    }
    const selectedPasskey = getSelectedPasskey();
    if (!selectedPasskey) {
      setPrfStatus("使用するパスキーを選択してください。", true);
      return;
    }
    const plaintext = prfElements.plaintextInput.value;
    const plaintextBytes = encoder.encode(plaintext);
    const maxBytes = Number(prfElements.plaintextInput.dataset.maxBytes ?? "0");
    if (plaintextBytes.length === 0) {
      setPrfStatus("平文を入力してください。", true);
      return;
    }
    if (maxBytes && plaintextBytes.length > maxBytes) {
      setPrfStatus(`平文が長すぎます (最大 ${maxBytes} バイト)`, true);
      return;
    }

    togglePrfBusy(true);
    setPrfStatus("PRFを利用して暗号化しています...");
    try {
      const { bytes: prfInputBytes, base64: prfInputBase64 } = randomBase64(PRF_INPUT_BYTE_LENGTH);
      const { prfBytes } = await requestPrfEvaluation(selectedPasskey.id, prfInputBase64);
      const { aesKey, iv } = await deriveAesArtifacts(prfBytes, prfInputBytes);
      const associatedData = `${selectedPasskey.id}:${crypto.randomUUID()}`;
      const ciphertextBuffer = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: encoder.encode(associatedData),
        },
        aesKey,
        plaintextBytes,
      );
      const ciphertextBytes = new Uint8Array(ciphertextBuffer);
      const tagStart = ciphertextBytes.length - AES_GCM_TAG_BYTE_LENGTH;
      const ciphertext = ciphertextBytes.slice(0, tagStart);
      const tag = ciphertextBytes.slice(tagStart);

      const labelValue = prfElements.labelInput?.value.trim() || undefined;
      const payload = {
        passkeyId: selectedPasskey.id,
        label: labelValue,
        ciphertext: toBase64(ciphertext),
        iv: toBase64(iv),
        tag: toBase64(tag),
        associatedData,
        version: 1,
        prfInput: prfInputBase64,
      };

      const storeRes = await webauthnClient.prf.encrypt.$post({ json: payload });
      if (!storeRes.ok) {
        const error = (await storeRes.json()).error ?? "暗号化データの保存に失敗しました";
        throw new Error(error);
      }
      const data = await storeRes.json();
      const entry = data.entry as PrfEntry;
      prfState.entries = [entry, ...prfState.entries];
      renderEntries();
      renderLatestOutput("暗号化結果", [
        { label: "Entry ID", value: entry.id },
        { label: "Ciphertext", value: entry.ciphertext },
        { label: "IV", value: entry.iv },
        { label: "Tag", value: entry.tag },
        { label: "Associated Data", value: entry.associatedData ?? "" },
        { label: "PRF Input", value: entry.prfInput },
      ]);
      setPrfStatus("暗号化と保存が完了しました。", false);
      prfElements.plaintextInput.value = "";
      if (prfElements.labelInput) {
        prfElements.labelInput.value = "";
      }
    } catch (error) {
      console.error(error);
      setPrfStatus(error instanceof Error ? error.message : "暗号化中にエラーが発生しました", true);
    } finally {
      togglePrfBusy(false);
    }
  };

  const handleDecrypt = async (entry: PrfEntry) => {
    togglePrfBusy(true);
    setPrfStatus("PRFを利用して復号しています...");
    try {
      const prfInputBytes = fromBase64(entry.prfInput);
      const { prfBytes } = await requestPrfEvaluation(entry.passkeyId, entry.prfInput);
      const { aesKey, iv } = await deriveAesArtifacts(prfBytes, prfInputBytes);
      const cipherBytes = concatBytes(fromBase64(entry.ciphertext), fromBase64(entry.tag));
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: entry.associatedData ? encoder.encode(entry.associatedData) : undefined,
        },
        aesKey,
        cipherBytes as unknown as BufferSource,
      );
      const plaintext = decoder.decode(decrypted);
      renderLatestOutput("復号結果", [
        { label: "Entry ID", value: entry.id },
        { label: "Plaintext", value: plaintext },
      ]);
      setPrfStatus("復号に成功しました。", false);
    } catch (error) {
      console.error(error);
      setPrfStatus(error instanceof Error ? error.message : "復号に失敗しました", true);
    } finally {
      togglePrfBusy(false);
    }
  };

  if (prfElements.encryptButton && prfElements.plaintextInput) {
    prfElements.encryptButton.addEventListener("click", () => {
      if (!prfState.loading) {
        void handleEncrypt();
      }
    });
  }

  if (prfElements.refreshButton) {
    prfElements.refreshButton.addEventListener("click", () => {
      if (!prfState.loading) {
        void loadEntries();
      }
    });
  }

  if (prfElements.entriesContainer) {
    void loadEntries();
  }
}
