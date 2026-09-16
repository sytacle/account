import { useEffect, useState } from "react";
import { CreditCard, ReceiptText } from "lucide-react";
import { Card } from "../components/Card";
import FormNotice from "../components/FormNotice";
import { useAuth } from "../context/AuthContext";
import { friendlyAuthError } from "../lib/authErrors";

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6 flex items-start gap-3 sm:gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 sm:size-12">
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

const billingFields = [
  ["name", "Name"],
  ["email", "Billing email"],
  ["addressLine1", "Address"],
  ["city", "City"],
  ["state", "State / region"],
  ["postalCode", "Postal code"],
  ["country", "Country"],
];

function money(amount, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount || 0);
}

function displayDate(value) {
  return value ? new Date(value).toLocaleDateString() : "Not available";
}

export default function PaymentsSection() {
  const { user } = useAuth();
  const [billingExists, setBillingExists] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const {
        getBilling,
        getPaymentMethods,
        getPurchases,
        getSubscriptions,
        getSubscriptionProducts,
      } = await import("../lib/accountApi.js");
      const [billingResult, methodsResult, purchasesResult, subscriptionsResult, productsResult] =
        await Promise.all([
          getBilling(user),
          getPaymentMethods(user),
          getPurchases(user),
          getSubscriptions(user),
          getSubscriptionProducts(user),
        ]);
      const nextBilling = billingResult.billing || {};
      setBillingExists(billingResult.exists === true);
      setForm(nextBilling);
      setPaymentMethods(methodsResult.paymentMethods || []);
      setPurchases(purchasesResult.purchases || []);
      setSubscriptions(subscriptionsResult.subscriptions || []);
      setProducts(productsResult.products || []);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function saveBilling(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { updateBilling } = await import("../lib/accountApi.js");
      await updateBilling(user, form);
      setNotice("Billing details saved.");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  }

  async function createBilling() {
    setBusy("billing");
    setError("");
    setNotice("");
    try {
      const { createBilling: create } = await import("../lib/accountApi.js");
      await create(user);
      setBillingExists(true);
      setNotice("Billing account created.");
      await load();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }

  async function removeMethod(id) {
    setBusy(id);
    setError("");
    try {
      const { removePaymentMethod } = await import("../lib/accountApi.js");
      await removePaymentMethod(user, id);
      setPaymentMethods((current) => current.filter((method) => method.id !== id));
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }

  async function cancelSubscription(id) {
    setBusy(id);
    setError("");
    try {
      const { cancelSubscription: cancel } = await import("../lib/accountApi.js");
      await cancel(user, id);
      setSubscriptions((current) =>
        current.map((subscription) =>
          subscription.id === id
            ? { ...subscription, cancelAtPeriodEnd: true }
            : subscription,
        ),
      );
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }

  async function subscribe(productId, priceId) {
    setBusy(priceId);
    setError("");
    setNotice("");
    try {
      const { createSubscription } = await import("../lib/accountApi.js");
      await createSubscription(user, productId, priceId);
      setNotice("Subscription created.");
      await load();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="max-w-4xl">
      <SectionHeader
        icon={CreditCard}
        title="Payments"
        subtitle="Manage billing details, payment methods, subscriptions, and purchases."
      />
      {error && <div className="mb-4"><FormNotice>{error}</FormNotice></div>}
      {notice && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{notice}</p>}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading billing details...</div>
      ) : !billingExists ? (
        <Card>
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Billing account</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No billing account yet.</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Create a billing account to manage payment methods, subscriptions, and purchase history.
            </p>
            <button
              type="button"
              onClick={createBilling}
              disabled={busy === "billing"}
              className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy === "billing" ? "Creating..." : "Create billing account"}
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Billing account</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Information used for invoices and receipts.</p>
            </div>
            <form onSubmit={saveBilling} className="grid gap-4 p-5 sm:grid-cols-2">
              {billingFields.map(([key, label]) => (
                <label key={key} className={key === "addressLine1" ? "sm:col-span-2" : ""}>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
                  <input
                    value={form[key] || ""}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              ))}
              <div className="sm:col-span-2">
                <button type="submit" disabled={saving} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                  {saving ? "Saving..." : "Save billing details"}
                </button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Subscription plans</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose a Sytacle plan for your account.</p>
            </div>
            {products.length ? products.map((product) => (
              <div key={product.id} className="border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{product.description || "Sytacle subscription plan"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.prices.map((price) => {
                      const activeSubscription = subscriptions.find(
                        (subscription) => subscription.priceId === price.id || subscription.productId === product.id,
                      );
                      return (
                        <button
                          key={price.id}
                          type="button"
                          onClick={() => subscribe(product.id, price.id)}
                          disabled={Boolean(activeSubscription) || busy === price.id}
                          className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/60 dark:text-blue-400"
                        >
                          {activeSubscription ? activeSubscription.status : busy === price.id ? "Subscribing..." : `${money(price.amount, price.currency)} / ${price.interval}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )) : <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">No subscription plans are available.</p>}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Payment methods</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Payment details are securely stored by the payment provider.</p>
            </div>
            {paymentMethods.length ? paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                <CreditCard size={19} className="text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{method.brand || "Card"} {method.last4 ? `ending in ${method.last4}` : ""}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{method.isDefault ? "Default payment method" : "Payment method"}</p>
                </div>
                <button type="button" onClick={() => removeMethod(method.id)} disabled={busy === method.id} className="text-xs font-medium text-rose-600 disabled:opacity-60 dark:text-rose-400">
                  {busy === method.id ? "Removing..." : "Remove"}
                </button>
              </div>
            )) : <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">No payment methods added.</p>}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Subscriptions</h3></div>
            {subscriptions.length ? subscriptions.map((subscription) => (
              <div key={subscription.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{subscription.planName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{money(subscription.amount, subscription.currency)} / {subscription.interval} · {subscription.status}</p></div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} {displayDate(subscription.currentPeriodEnd)}</span>
                  {!subscription.cancelAtPeriodEnd && subscription.status === "active" && (
                    <button type="button" onClick={() => cancelSubscription(subscription.id)} disabled={busy === subscription.id} className="text-xs font-medium text-rose-600 disabled:opacity-60 dark:text-rose-400">
                      {busy === subscription.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            )) : <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">No active subscriptions.</p>}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Purchase history</h3></div>
            {purchases.length ? purchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                <ReceiptText size={19} className="text-slate-500" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900 dark:text-slate-100">{purchase.description}</p><p className="text-xs text-slate-500 dark:text-slate-400">{displayDate(purchase.purchasedAt)} · {purchase.status}</p></div><span className="text-sm font-medium text-slate-900 dark:text-slate-100">{money(purchase.amount, purchase.currency)}</span>
              </div>
            )) : <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">No purchases yet.</p>}
          </Card>
        </div>
      )}
    </div>
  );
}
