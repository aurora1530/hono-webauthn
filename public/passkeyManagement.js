"use strict";
(() => {
  // src/client/lib/changePasskeyName.ts
  function handleChangePasskeyName(passkeyId, currentName) {
    const newName = prompt("\u65B0\u3057\u3044\u30D1\u30B9\u30AD\u30FC\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044:", currentName);
    if (newName) {
      fetch("/auth/webauthn/change-passkey-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ passkeyId, newName })
      }).then((response) => response.json()).then((data) => {
        if (data.success) {
          alert(`\u30D1\u30B9\u30AD\u30FC\u540D\u3092 "${newName}" \u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`);
          location.reload();
        } else {
          alert(`\u30D1\u30B9\u30AD\u30FC\u540D\u306E\u5909\u66F4\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${data.message}`);
        }
      }).catch((error) => {
        console.error("Error:", error);
        alert("\u30D1\u30B9\u30AD\u30FC\u540D\u306E\u5909\u66F4\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002");
      });
    }
  }

  // src/client/lib/reauthentication.ts
  async function handleReauthentication() {
    const generateReauthenticationOptionsResponse = await fetch(
      "/auth/webauthn/reauthentication/generate",
      {
        method: "GET"
      }
    );
    const options = PublicKeyCredential.parseRequestOptionsFromJSON(
      await generateReauthenticationOptionsResponse.json()
    );
    console.log(options);
    const credential = await navigator.credentials.get({ publicKey: options });
    const credentialResponse = await fetch("/auth/webauthn/reauthentication/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credential)
    });
    const credentialJson = await credentialResponse.json();
    if (!credentialJson.success) {
      alert(credentialJson.message);
      return false;
    }
    return true;
  }

  // src/client/lib/deletePasskey.ts
  async function handleDeletePasskey(passkeyId) {
    if (confirm("\u672C\u5F53\u306B\u3053\u306E\u30D1\u30B9\u30AD\u30FC\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")) {
      alert("\u518D\u8A8D\u8A3C\u3092\u958B\u59CB\u3057\u307E\u3059\u3002");
      const reauthSuccess = await handleReauthentication();
      if (!reauthSuccess) {
        alert("\u518D\u8A8D\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30D1\u30B9\u30AD\u30FC\u306F\u524A\u9664\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
        return;
      }
      fetch("/auth/webauthn/delete-passkey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ passkeyId })
      }).then((response) => response.json()).then((data) => {
        if (data.success) {
          alert(`${data.message}`);
          location.reload();
        } else {
          alert(`\u30D1\u30B9\u30AD\u30FC\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${data.message}`);
        }
      }).catch((error) => {
        console.error("Error:", error);
        alert("\u30D1\u30B9\u30AD\u30FC\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002");
      });
    }
  }

  // src/client/lib/registration.ts
  async function handleRegistration(isNewAccount = true) {
    if (isNewAccount) {
      const usernameEle = document.getElementById("username");
      if (!usernameEle || !(usernameEle instanceof HTMLInputElement)) {
        return;
      }
      const username = usernameEle.value;
      const usernameRegisterResponse = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username
        })
      });
      const json = await usernameRegisterResponse.json();
      if (!json.success) {
        alert(json.message);
        return;
      }
    } else {
      alert("\u518D\u8A8D\u8A3C\u3092\u958B\u59CB\u3057\u307E\u3059\u3002");
      const reauthSuccess = await handleReauthentication();
      if (!reauthSuccess) {
        alert("\u518D\u8A8D\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30D1\u30B9\u30AD\u30FC\u306E\u8FFD\u52A0\u306F\u884C\u308F\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
        return;
      }
    }
    const generateRegistrationOptionsResponse = await fetch("/auth/webauthn/registration/generate", {
      method: "GET"
    });
    const options = PublicKeyCredential.parseCreationOptionsFromJSON(await generateRegistrationOptionsResponse.json());
    console.log(options);
    const credential = await navigator.credentials.create({ publicKey: options });
    const credentialResponse = await fetch("/auth/webauthn/registration/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credential)
    });
    const credentialJson = await credentialResponse.json();
    if (!credentialJson.success) {
      alert(credentialJson.message);
      return;
    }
    if (isNewAccount) {
      alert("\u65B0\u898F\u767B\u9332\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F");
      location.href = "/auth/login";
    } else {
      alert("\u30D1\u30B9\u30AD\u30FC\u306E\u8FFD\u52A0\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F");
      location.reload();
    }
  }

  // src/client/passkeyManagement.ts
  document.getElementById("add-passkey-button")?.addEventListener("click", () => {
    handleRegistration(false);
  });
  var changePasskeyNameBtns = document.getElementsByClassName("change-passkey-name-btn");
  Array.from(changePasskeyNameBtns).forEach((btn) => {
    btn.addEventListener("click", () => {
      const passkeyId = btn.dataset.passkeyId;
      const passkeyName = btn.dataset.passkeyName;
      if (passkeyId && passkeyName) handleChangePasskeyName(passkeyId, passkeyName);
    });
  });
  var deletePasskeyBtns = document.getElementsByClassName("delete-passkey-btn");
  Array.from(deletePasskeyBtns).forEach((btn) => {
    btn.addEventListener("click", () => {
      const passkeyId = btn.dataset.passkeyId;
      if (passkeyId) handleDeletePasskey(passkeyId);
    });
  });
})();
