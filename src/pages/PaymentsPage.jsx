import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CreditCard, ReceiptText, WalletCards } from "lucide-react";
import { Card } from "../components/Card";
import FormNotice from "../components/FormNotice";
import { useAuth } from "../context/AuthContext";
import { friendlyAuthError } from "../lib/authErrors";

const fallbackCountries = [["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"], ["AU", "Australia"], ["PH", "Philippines"], ["JP", "Japan"]];
const billingFields = [["name", "Name"], ["email", "Billing email"], ["addressLine1", "Address"], ["city", "City"], ["state", "State / region"], ["postalCode", "Postal code"]];
const subscriptionPlans = {
  free: { name: "Free", description: "Core account features." },
  pro: { name: "Pro", description: "More capacity and advanced features." },
  business: { name: "Business", description: "Expanded features for teams and organizations." },
};

function money(amount, currency) { return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount || 0); }
function date(value) { return value ? new Date(value).toLocaleDateString() : "Not available"; }
function Header({ icon: Icon, title, subtitle }) { return <div className="mb-6 flex items-start gap-3 sm:gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 sm:size-12"><Icon size={22} /></span><div className="min-w-0"><h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">{title}</h1><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p></div></div>; }
function Page({ children, icon, title, subtitle, back = false }) { const navigate = useNavigate(); return <div className="max-w-4xl">{back && <button type="button" onClick={() => navigate("/account/payments")} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-400"><ArrowLeft size={17} />Back to Payments</button>}<Header icon={icon} title={title} subtitle={subtitle} />{children}</div>; }
function Message({ error, notice }) { return <>{error && <div className="mb-4"><FormNotice>{error}</FormNotice></div>}{notice && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{notice}</p>}</>; }
function Loading() { return <div className="py-12 text-center text-sm text-slate-500">Loading...</div>; }

function BillingPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({}); const [accounts, setAccounts] = useState([]); const [activeAccountId, setActiveAccountId] = useState(""); const [selectedId, setSelectedId] = useState(""); const [creating, setCreating] = useState(false); const [countries, setCountries] = useState(fallbackCountries); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(""); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => { let active = true; fetch("https://restcountries.com/v3.1/all?fields=cca2,name").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (active) setCountries(data.filter((item) => item.cca2 && item.name?.common).map((item) => [item.cca2, item.name.common]).sort((a, b) => a[1].localeCompare(b[1]))); }).catch(() => {}); return () => { active = false; }; }, []);
  async function load() { try { const { getBilling } = await import("../lib/accountApi.js"); const result = await getBilling(user); const nextAccounts = result.accounts || []; setAccounts(nextAccounts); setActiveAccountId(result.activeAccountId || nextAccounts.find((account) => account.isActive)?.id || ""); const selected = nextAccounts.find((account) => account.isActive) || nextAccounts[0]; setSelectedId(selected?.id || ""); setForm(selected || result.billing || {}); } catch (err) { setError(friendlyAuthError(err)); } finally { setLoading(false); } }
  useEffect(() => { load(); }, [user]);
  function manage(account) { setCreating(false); setSelectedId(account.id); setForm(account); setNotice(""); }
  function startCreate() { setCreating(true); setSelectedId(""); setForm({ name: user?.displayName || "", email: user?.email || "" }); setNotice(""); }
  async function activate(id) { setBusy(`activate:${id}`); setError(""); try { const { activateBillingAccount } = await import("../lib/accountApi.js"); await activateBillingAccount(user, id); setActiveAccountId(id); setAccounts((items) => items.map((account) => ({ ...account, isActive: account.id === id }))); setNotice("Current billing account updated."); } catch (err) { setError(friendlyAuthError(err)); } finally { setBusy(""); } }
  async function save(event) { event.preventDefault(); setBusy("save"); setError(""); setNotice(""); try { const api = await import("../lib/accountApi.js"); if (creating || !selectedId) { const result = await api.createBilling(user, form); setAccounts((items) => [...items.map((account) => ({ ...account, isActive: result.account.isActive })), result.account]); setSelectedId(result.account.id); setActiveAccountId(result.account.isActive ? result.account.id : activeAccountId); setForm(result.account); setCreating(false); setNotice("Billing account created."); } else if (selectedId === "account") { await api.updateBilling(user, form); setNotice("Billing details saved."); await load(); } else { const result = await api.updateBillingAccount(user, selectedId, form); setAccounts((items) => items.map((account) => account.id === selectedId ? result.account : account)); setNotice("Billing details saved."); } } catch (err) { setError(friendlyAuthError(err)); } finally { setBusy(""); } }
  return <Page back icon={WalletCards} title="Billing accounts" subtitle="Manage the details used for invoices and receipts."><Message error={error} notice={notice} />{loading ? <Loading /> : <div className="space-y-5"><Card><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">Your billing accounts</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select the account used for your current billing activity.</p></div><button type="button" onClick={startCreate} className="rounded-full bg-blue-600 px-3 py-2 text-xs font-medium text-white">Add account</button></div>{accounts.length ? accounts.map((account) => <div key={account.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{account.name || "Billing account"}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{account.email || "No billing email"}</p></div>{account.isActive && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Current</span>}<button type="button" onClick={() => manage(account)} className="text-xs font-medium text-blue-600 dark:text-blue-400">Manage account</button>{!account.isActive && <button type="button" onClick={() => activate(account.id)} disabled={busy === `activate:${account.id}`} className="text-xs font-medium text-slate-600 disabled:opacity-60 dark:text-slate-300">{busy === `activate:${account.id}` ? "Switching..." : "Make current"}</button>}</div>) : <p className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">No billing accounts yet.</p>}</Card><Card><div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">{creating ? "New billing account" : "Manage account"}</h3></div><form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">{billingFields.map(([key, label]) => <label key={key} className={key === "addressLine1" ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span><input required={key === "name" || key === "email"} type={key === "email" ? "email" : "text"} value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950" /></label>)}<label><span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Country</span><select required={!selectedId || creating} value={form.country || ""} onChange={(event) => setForm({ ...form, country: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">Select a country</option>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><div className="sm:col-span-2"><button type="submit" disabled={busy === "save"} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy === "save" ? "Saving..." : creating ? "Create billing account" : "Save billing details"}</button></div></form></Card></div>}</Page>;
}

function PaymentMethodsPage() {
  const { user } = useAuth(); const [methods, setMethods] = useState([]); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  useEffect(() => { import("../lib/accountApi.js").then(({ getPaymentMethods }) => getPaymentMethods(user)).then((result) => setMethods(result.paymentMethods || [])).catch((err) => setError(friendlyAuthError(err))); }, [user]);
  async function remove(id) { setBusy(id); setError(""); try { const { removePaymentMethod } = await import("../lib/accountApi.js"); await removePaymentMethod(user, id); setMethods((items) => items.filter((item) => item.id !== id)); } catch (err) { setError(friendlyAuthError(err)); } finally { setBusy(""); } }
  return <Page back icon={CreditCard} title="Payment methods" subtitle="Manage the cards and payment methods used for your purchases."><Message error={error} /><Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">{methods.length ? methods.map((method) => <div key={method.id} className="flex items-center gap-3 px-5 py-4"><CreditCard size={19} className="text-slate-500" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{method.brand || "Card"} {method.last4 ? `ending in ${method.last4}` : ""}</p><p className="text-xs text-slate-500 dark:text-slate-400">{method.isDefault ? "Default payment method" : "Payment method"}</p></div><button type="button" onClick={() => remove(method.id)} disabled={busy === method.id} className="text-xs font-medium text-rose-600 disabled:opacity-60 dark:text-rose-400">{busy === method.id ? "Removing..." : "Remove"}</button></div>) : <p className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">No payment methods added.</p>}</Card></Page>;
}

function ClaimSubscriptionsPage() {
  const { user } = useAuth();
  const [planKey, setPlanKey] = useState("free");
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      user.getIdTokenResult(true),
      import("../lib/accountApi.js").then(({ getSubscriptions }) => getSubscriptions(user)),
    ])
      .then(([tokenResult, subscriptionResult]) => {
        if (!active) return;
        const claimedPlan = user.customClaims?.subscription || tokenResult.claims?.subscription || "free";
        setPlanKey(subscriptionPlans[claimedPlan] ? claimedPlan : "free");
        setSubscriptions(subscriptionResult.subscriptions || []);
      })
      .catch((err) => { if (active) setError(friendlyAuthError(err)); });
    return () => { active = false; };
  }, [user]);

  async function cancel(id) {
    setBusy(id);
    try {
      const { cancelSubscription } = await import("../lib/accountApi.js");
      await cancelSubscription(user, id);
      setSubscriptions((items) => items.map((item) => item.id === id ? { ...item, cancelAtPeriodEnd: true } : item));
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }

  const activePlan = subscriptionPlans[planKey];
  return <Page back icon={CreditCard} title="Subscriptions" subtitle="View your current plan and recurring billing details.">
    <Message error={error} />
    <div className="space-y-5">
      <Card>
        <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Current plan</h3></div>
        <div className="flex flex-wrap items-start gap-3 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"><CreditCard size={20} /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 dark:text-slate-100">{activePlan.name}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activePlan.description}</p><p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Current plan</p></div>{planKey !== "business" && <button type="button" onClick={() => document.getElementById("available-plans")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Upgrade plan</button>}</div>
      </Card>
      <div id="available-plans">
      <Card>
        <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Available plans</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Compare the plans available for your account.</p></div>
        {Object.entries(subscriptionPlans).map(([key, plan]) => <div key={key} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{plan.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plan.description}</p></div>{key === planKey && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Current</span>}</div>)}
      </Card>
      </div>
      {subscriptions.length > 0 && <Card><div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Billing subscriptions</h3></div>{subscriptions.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.planName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{money(item.amount, item.currency)} / {item.interval} · {item.status}</p></div><div className="flex shrink-0 flex-col items-end gap-2"><span className="text-xs text-slate-500 dark:text-slate-400">{item.cancelAtPeriodEnd ? "Ends" : "Renews"} {date(item.currentPeriodEnd)}</span>{!item.cancelAtPeriodEnd && item.status === "active" && <button type="button" onClick={() => cancel(item.id)} disabled={busy === item.id} className="text-xs font-medium text-rose-600 disabled:opacity-60 dark:text-rose-400">{busy === item.id ? "Cancelling..." : "Cancel"}</button>}</div></div>)}</Card>}
    </div>
  </Page>;
}

function SubscriptionsPage() {
  const { user } = useAuth(); const [subscriptions, setSubscriptions] = useState([]); const [products, setProducts] = useState([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(""); const [notice, setNotice] = useState("");
  async function load() { try { const api = await import("../lib/accountApi.js"); const [subscriptionResult, productResult] = await Promise.all([api.getSubscriptions(user), api.getSubscriptionProducts(user)]); setSubscriptions(subscriptionResult.subscriptions || []); setProducts(productResult.products || []); } catch (err) { setError(friendlyAuthError(err)); } }
  useEffect(() => { load(); }, [user]);
  async function subscribe(productId, priceId) { setBusy(priceId); setError(""); try { const { createSubscription } = await import("../lib/accountApi.js"); await createSubscription(user, productId, priceId); setNotice("Subscription created."); await load(); } catch (err) { setError(friendlyAuthError(err)); } finally { setBusy(""); } }
  async function cancel(id) { setBusy(id); try { const { cancelSubscription } = await import("../lib/accountApi.js"); await cancelSubscription(user, id); setSubscriptions((items) => items.map((item) => item.id === id ? { ...item, cancelAtPeriodEnd: true } : item)); } catch (err) { setError(friendlyAuthError(err)); } finally { setBusy(""); } }
  return <Page icon={CreditCard} title="Subscriptions" subtitle="Choose a plan and manage your recurring services."><Message error={error} notice={notice} /><div className="space-y-5"><Card><div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Available plans</h3></div>{products.length ? products.map((product) => <div key={product.id} className="border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{product.name}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.description || "Sytacle subscription plan"}</p></div><div className="flex flex-wrap gap-2">{product.prices.map((price) => { const active = subscriptions.find((item) => item.priceId === price.id || item.productId === product.id); return <button key={price.id} type="button" onClick={() => subscribe(product.id, price.id)} disabled={Boolean(active) || busy === price.id} className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 disabled:opacity-60 dark:border-blue-900/60 dark:text-blue-400">{active ? active.status : busy === price.id ? "Subscribing..." : `${money(price.amount, price.currency)} / ${price.interval}`}</button>; })}</div></div></div>) : <p className="px-5 py-4 text-sm text-slate-500">No subscription plans are available.</p>}</Card><Card><div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Your subscriptions</h3></div>{subscriptions.length ? subscriptions.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.planName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{money(item.amount, item.currency)} / {item.interval} · {item.status}</p></div><div className="flex shrink-0 flex-col items-end gap-2"><span className="text-xs text-slate-500 dark:text-slate-400">{item.cancelAtPeriodEnd ? "Ends" : "Renews"} {date(item.currentPeriodEnd)}</span>{!item.cancelAtPeriodEnd && item.status === "active" && <button type="button" onClick={() => cancel(item.id)} disabled={busy === item.id} className="text-xs font-medium text-rose-600 disabled:opacity-60 dark:text-rose-400">{busy === item.id ? "Cancelling..." : "Cancel"}</button>}</div></div>) : <p className="px-5 py-4 text-sm text-slate-500">No active subscriptions.</p>}</Card></div></Page>;
}

function PurchasesPage() {
  const { user } = useAuth(); const [purchases, setPurchases] = useState([]); const [error, setError] = useState("");
  useEffect(() => { import("../lib/accountApi.js").then(({ getPurchases }) => getPurchases(user)).then((result) => setPurchases(result.purchases || [])).catch((err) => setError(friendlyAuthError(err))); }, [user]);
  return <Page back icon={ReceiptText} title="Purchase history" subtitle="Review your previous purchases, receipts, and payment status."><Message error={error} /><Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">{purchases.length ? purchases.map((purchase) => <div key={purchase.id} className="flex items-center gap-3 px-5 py-4"><ReceiptText size={19} className="text-slate-500" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{purchase.description}</p><p className="text-xs text-slate-500 dark:text-slate-400">{date(purchase.purchasedAt)} · {purchase.status}</p></div><span className="text-sm font-medium text-slate-900 dark:text-slate-100">{money(purchase.amount, purchase.currency)}</span></div>) : <p className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">No purchases yet.</p>}</Card></Page>;
}

const links = [["billing", "Billing account", "Manage invoice and receipt details.", WalletCards], ["payment-methods", "Payment methods", "Manage cards and other payment methods.", CreditCard], ["subscriptions", "Subscriptions", "Choose plans and manage recurring services.", CreditCard], ["purchases", "Purchase history", "Review previous purchases and receipts.", ReceiptText]];
function PaymentsHome() { return <Page icon={CreditCard} title="Payments" subtitle="Choose a finance area to view or manage in detail."><div className="grid gap-4 sm:grid-cols-2">{links.map(([path, title, description, Icon]) => <Link key={path} to={`/account/payments/${path}`} className="group"><Card className="h-full p-5 transition hover:border-blue-300 dark:hover:border-blue-700"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"><Icon size={20} /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p></div><ArrowRight size={18} className="mt-1 text-slate-400 transition group-hover:translate-x-1" /></div></Card></Link>)}</div></Page>; }

export default function PaymentsPage() { const path = useLocation().pathname.split("/")[3] || ""; if (path === "billing") return <BillingPage />; if (path === "payment-methods") return <PaymentMethodsPage />; if (path === "subscriptions") return <ClaimSubscriptionsPage />; if (path === "purchases") return <PurchasesPage />; return <PaymentsHome />; }