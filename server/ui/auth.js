(() => {
  const style = document.createElement("style");
  style.textContent = `.account-launch{position:fixed;bottom:1rem;left:1rem;z-index:1000;padding:.7rem 1rem;border-radius:999px;border:1px solid #cbd5e1;background:#172554;color:#fff;font:600 14px system-ui;cursor:pointer;box-shadow:0 6px 20px #0002}.account-dialog{width:min(90vw,420px);padding:24px;border:1px solid #cbd5e1;border-radius:16px;background:white;color:#172554;font:16px system-ui}.account-dialog::backdrop{background:#0f172a99}.account-dialog form{display:grid;gap:10px}.account-dialog input,.account-dialog button{box-sizing:border-box;width:100%;padding:12px;font:inherit;border:1px solid #94a3b8;border-radius:8px}.account-dialog h2{font:700 24px system-ui;white-space:normal}.account-dialog button{cursor:pointer;background:#172554;color:white}.account-dialog .account-close{width:auto;float:right;background:white;color:#172554}.account-dialog [role=status]{min-height:24px;white-space:normal}.account-dialog a{color:#1d4ed8}.account-dialog :focus-visible,.account-launch:focus-visible{outline:3px solid #3b82f6;outline-offset:3px}`;
  document.head.append(style);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "account-launch";
  button.textContent = "Sign in · Account";
  document.body.append(button);
  const dialog = document.createElement("dialog");
  dialog.className = "account-dialog";
  dialog.setAttribute("aria-labelledby", "account-heading");
  dialog.innerHTML = `<button type="button" class="account-close" aria-label="Close account dialog">Close</button><h2 id="account-heading">Sign in</h2><p>Save your work to your account and reopen it from another browser.</p><form><label class="account-name-label" hidden for="account-name">Your name</label><input hidden id="account-name" name="name" autocomplete="name" maxlength="80"><label for="account-email">Account email</label><input id="account-email" name="email" type="email" autocomplete="username" required maxlength="254"><label for="account-password">Account password</label><input id="account-password" name="password" type="password" autocomplete="current-password" required minlength="12" maxlength="128"><button type="submit">Sign in</button><p role="status" aria-live="polite"></p></form><button type="button" class="account-mode">Create an account</button>`;
  document.body.append(dialog);
  let registering = false;
  const form = dialog.querySelector("form"),
    name = form.elements.name,
    password = form.elements.password,
    status = form.querySelector("[role=status]"),
    submit = form.querySelector("[type=submit]");
  button.addEventListener("click", () => dialog.showModal());
  dialog
    .querySelector(".account-close")
    .addEventListener("click", () => dialog.close());
  dialog.querySelector(".account-mode").addEventListener("click", () => {
    registering = !registering;
    name.hidden = !registering;
    name.required = registering;
    dialog.querySelector(".account-name-label").hidden = !registering;
    password.autocomplete = registering ? "new-password" : "current-password";
    dialog.querySelector("h2").textContent = registering
      ? "Create an account"
      : "Sign in";
    submit.textContent = registering ? "Create account" : "Sign in";
    dialog.querySelector(".account-mode").textContent = registering
      ? "Already have an account? Sign in"
      : "Create an account";
    status.textContent = "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    status.textContent = "Checking your account…";
    try {
      const response = await fetch(
        "/api/auth/" + (registering ? "register" : "login"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      password.value = "";
      window.location.reload();
    } catch (error) {
      status.textContent = error.message || "Unable to sign in.";
    } finally {
      submit.disabled = false;
    }
  });
  fetch("/api/auth/me")
    .then((response) => (response.ok ? response.json() : null))
    .then((result) => {
      if (!result?.user) return;
      button.textContent = "My workspace";
      button.replaceWith(
        Object.assign(document.createElement("a"), {
          className: "account-launch",
          href: "/account",
          textContent: "My workspace",
        }),
      );
      dialog.remove();
    })
    .catch(() => {
      button.textContent = "Account · Start the local server";
    });
})();
