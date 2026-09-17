import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { Card } from "../components/Card";
import CustomSelect from "../components/CustomSelect";
import FormNotice from "../components/FormNotice";
import { useAuth } from "../context/AuthContext";
import { friendlyAuthError } from "../lib/authErrors";
import { fallbackCountries, getCountries } from "../lib/countries";

const billingFields = [
  ["name", "Name"],
  ["email", "Billing email"],
  ["addressLine1", "Address"],
  ["city", "City"],
  ["state", "State / region"],
  ["postalCode", "Postal code"],
];
const subscriptionPlans = {
  free: {
    name: "Free",
    description: "A practical starting point for every user.",
    features: [
      "5 GB of storage per user",
      "Limited access to the Family platform",
      "Limited account features",
    ],
  },
  pro: {
    name: "Pro",
    description: "More features for users who want to do more.",
    features: [
      "More account features",
      "Access to Sytacle AI",
      "Access to experimental features",
      "More storage and capacity",
    ],
  },
  business: {
    name: "Business",
    description: "Broader access for teams and organizations.",
    features: [
      "More access to all Sytacle features",
      "Expanded team and organization capabilities",
      "Priority access to new features",
      "Higher storage and capacity limits",
    ],
  },
};

function money(amount, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(amount || 0);
}
function date(value) {
  return value ? new Date(value).toLocaleDateString() : "Not available";
}
function Header({ icon: Icon, title, subtitle }) {
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
function Page({ children, icon, title, subtitle, back = false }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl">
      {back && (
        <button
          type="button"
          onClick={() => navigate("/account/payments")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-400"
        >
          <ArrowLeft size={17} />
          Back to Payments
        </button>
      )}
      <Header icon={icon} title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}
function Message({ error, notice }) {
  return (
    <>
      {error && (
        <div className="mb-4">
          <FormNotice>{error}</FormNotice>
        </div>
      )}
      {notice && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {notice}
        </p>
      )}
    </>
  );
}
function Loading() {
  return (
    <div className="py-12 text-center text-sm text-slate-500">Loading...</div>
  );
}

function BillingForm({ user, account, onSaved }) {
  const [form, setForm] = useState(
    account || { name: user?.displayName || "", email: user?.email || "" },
  );
  const [countries, setCountries] = useState(fallbackCountries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    getCountries()
      .then(setCountries)
      .catch(() => {});
  }, []);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const api = await import("../lib/accountApi.js");
      const result = account
        ? await api.updateBillingAccount(user, account.id, form)
        : await api.createBilling(user, form);
      onSaved(result.account);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      back
      icon={WalletCards}
      title={account ? "Manage billing account" : "Create billing account"}
      subtitle="Keep invoice and receipt details in a separate billing account."
    >
      <Message error={error} />
      <Card>
        <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
          {billingFields.map(([key, label]) => (
            <label
              key={key}
              className={key === "addressLine1" ? "sm:col-span-2" : ""}
            >
              <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {label}
              </span>
              <input
                required={key === "name" || key === "email"}
                type={key === "email" ? "email" : "text"}
                value={form[key] || ""}
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          ))}
          <label>
            <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Country
            </span>
            <CustomSelect
              value={form.country || ""}
              onChange={(value) => setForm({ ...form, country: value })}
              options={countries.map(([code, name]) => ({
                value: code,
                label: name,
              }))}
              placeholder="Select a country"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy
                ? "Saving..."
                : account
                  ? "Save billing details"
                  : "Create billing account"}
            </button>
          </div>
        </form>
      </Card>
    </Page>
  );
}

function BillingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    try {
      const { getBilling } = await import("../lib/accountApi.js");
      setAccounts((await getBilling(user)).accounts || []);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [user]);
  async function activate(id) {
    setBusy(id);
    setError("");
    try {
      const { activateBillingAccount } = await import("../lib/accountApi.js");
      await activateBillingAccount(user, id);
      setAccounts((items) =>
        items.map((account) => ({ ...account, isActive: account.id === id })),
      );
      setNotice("Current billing account updated.");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }
  return (
    <Page
      back
      icon={WalletCards}
      title="Billing accounts"
      subtitle="Choose an available account for invoices and receipts."
    >
      <Message error={error} notice={notice} />
      {loading ? (
        <Loading />
      ) : (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Available accounts
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Only saved billing accounts appear here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/account/payments/billing/new")}
              className="rounded-full bg-blue-600 px-3 py-2 text-xs font-medium text-white"
            >
              Add account
            </button>
          </div>
          {accounts.length ? (
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {account.name || "Billing account"}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {account.email || "No billing email"}
                  </p>
                </div>
                {account.isActive && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Current
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/account/payments/billing/${account.id}`)
                  }
                  className="text-xs font-medium text-blue-600 dark:text-blue-400"
                >
                  Manage
                </button>
                {!account.isActive && (
                  <button
                    type="button"
                    onClick={() => activate(account.id)}
                    disabled={busy === account.id}
                    className="text-xs font-medium text-slate-600 disabled:opacity-60 dark:text-slate-300"
                  >
                    {busy === account.id ? "Switching..." : "Make current"}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
              No billing accounts yet. Create one to use for subscriptions and
              receipts.
            </div>
          )}
        </Card>
      )}
    </Page>
  );
}

function PaymentMethodsPage() {
  const { user } = useAuth();
  const [methods, setMethods] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    import("../lib/accountApi.js")
      .then(({ getPaymentMethods }) => getPaymentMethods(user))
      .then((result) => setMethods(result.paymentMethods || []))
      .catch((err) => setError(friendlyAuthError(err)));
  }, [user]);
  async function remove(id) {
    setBusy(id);
    setError("");
    try {
      const { removePaymentMethod } = await import("../lib/accountApi.js");
      await removePaymentMethod(user, id);
      setMethods((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }
  return (
    <Page
      back
      icon={CreditCard}
      title="Payment methods"
      subtitle="Manage the cards and payment methods used for your purchases."
    >
      <Message error={error} />
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {methods.length ? (
          methods.map((method) => (
            <div key={method.id} className="flex items-center gap-3 px-5 py-4">
              <CreditCard size={19} className="text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {method.brand || "Card"}{" "}
                  {method.last4 ? `ending in ${method.last4}` : ""}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {method.isDefault
                    ? "Default payment method"
                    : "Payment method"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(method.id)}
                disabled={busy === method.id}
                className="text-xs font-medium text-rose-600 disabled:opacity-60 dark:text-rose-400"
              >
                {busy === method.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))
        ) : (
          <p className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">
            No payment methods added.
          </p>
        )}
      </Card>
    </Page>
  );
}

function ClaimSubscriptionsPage() {
  const { user } = useAuth();
  const [planKey, setPlanKey] = useState("free");
  const [expiresAt, setExpiresAt] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      user.getIdTokenResult(true),
      import("../lib/accountApi.js").then(({ getSubscriptions }) =>
        getSubscriptions(user),
      ),
    ])
      .then(([tokenResult, subscriptionResult]) => {
        if (!active) return;
        const claimedPlan =
          user.customClaims?.subscription ||
          tokenResult.claims?.subscription ||
          "free";
        setPlanKey(subscriptionPlans[claimedPlan] ? claimedPlan : "free");
        setExpiresAt(tokenResult.claims?.subscriptionExpiresAt || null);
        setSubscriptions(subscriptionResult.subscriptions || []);
      })
      .catch((err) => {
        if (active) setError(friendlyAuthError(err));
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function cancel(id) {
    setBusy(id);
    try {
      const { cancelSubscription } = await import("../lib/accountApi.js");
      await cancelSubscription(user, id);
      setSubscriptions((items) =>
        items.map((item) =>
          item.id === id ? { ...item, cancelAtPeriodEnd: true } : item,
        ),
      );
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }

  const activePlan = subscriptionPlans[planKey];
  return (
    <Page
      back
      icon={CreditCard}
      title="Subscriptions"
      subtitle="View your current plan and recurring billing details."
    >
      <Message error={error} />
      <div className="space-y-5">
        <Card>
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Current plan
            </h3>
          </div>
          <div className="flex flex-wrap items-start gap-3 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <CreditCard size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {activePlan.name}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {activePlan.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Current plan
                </span>
                {expiresAt && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Renews or expires {date(expiresAt)}
                  </span>
                )}
              </div>
            </div>
            {planKey !== "business" && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("available-plans")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Upgrade plan
              </button>
            )}
          </div>
        </Card>
        <div id="available-plans">
          <Card>
            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Available plans
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Compare the plans available for your account.
              </p>
            </div>
            {Object.entries(subscriptionPlans).map(([key, plan]) => (
              <Link
                key={key}
                to={`/account/payments/subscriptions/${key}`}
                className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {plan.description}
                  </p>
                </div>
                {key === planKey && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Current
                  </span>
                )}
                <ArrowRight size={17} className="shrink-0 text-slate-400" />
              </Link>
            ))}
          </Card>
        </div>
        {subscriptions.length > 0 && (
          <Card>
            <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Billing subscriptions
              </h3>
            </div>
            {subscriptions.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.planName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {money(item.amount, item.currency)} / {item.interval} ·{" "}
                    {item.status}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                    {date(item.currentPeriodEnd)}
                  </span>
                  {!item.cancelAtPeriodEnd && item.status === "active" && (
                    <button
                      type="button"
                      onClick={() => cancel(item.id)}
                      disabled={busy === item.id}
                      className="text-xs font-medium text-rose-600 disabled:opacity-60 dark:text-rose-400"
                    >
                      {busy === item.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </Page>
  );
}

function PlanDetailsPage({ planKey }) {
  const plan = subscriptionPlans[planKey] || subscriptionPlans.free;
  return (
    <Page
      back
      icon={CreditCard}
      title={`${plan.name} plan`}
      subtitle="Plan details and included features."
    >
      <Card>
        <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {plan.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {plan.description}
          </p>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300"
            >
              {feature}
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}

function SubscriptionsPage() {
  const { user } = useAuth();
  const [planKey, setPlanKey] = useState("free");
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    const api = await import("../lib/accountApi.js");
    const [tokenResult, subscriptionResult, productResult] =
      await Promise.allSettled([
        user.getIdTokenResult(true),
        api.getSubscriptions(user),
        api.getSubscriptionProducts(user),
      ]);
    if (tokenResult.status === "fulfilled") {
      const claimedPlan = tokenResult.value.claims?.subscription || "free";
      setPlanKey(subscriptionPlans[claimedPlan] ? claimedPlan : "free");
    } else setError(friendlyAuthError(tokenResult.reason));
    if (subscriptionResult.status === "fulfilled")
      setSubscriptions(subscriptionResult.value.subscriptions || []);
    else setError(friendlyAuthError(subscriptionResult.reason));
    if (productResult.status === "fulfilled")
      setProducts(productResult.value.products || []);
    else setError(friendlyAuthError(productResult.reason));
  }
  useEffect(() => {
    load();
  }, [user]);
  async function subscribe(productId, priceId) {
    setBusy(priceId);
    setError("");
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
  async function cancel(id) {
    setBusy(id);
    try {
      const { cancelSubscription } = await import("../lib/accountApi.js");
      await cancelSubscription(user, id);
      setSubscriptions((items) =>
        items.map((item) =>
          item.id === id ? { ...item, cancelAtPeriodEnd: true } : item,
        ),
      );
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }
  const activePlan = subscriptionPlans[planKey];
  return (
    <Page
      icon={CreditCard}
      title="Subscriptions"
      subtitle="Choose a plan and manage your recurring services."
    >
      <Message error={error} notice={notice} />
      <div className="space-y-5">
        <Card>
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Current plan
            </h3>
          </div>
          <div className="flex items-start gap-3 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <CreditCard size={20} />
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {activePlan.name}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {activePlan.description}
              </p>
              <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                From Firebase subscription claim
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Available plans
            </h3>
          </div>
          {products.length ? (
            products.map((product) => (
              <div
                key={product.id}
                className="border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {product.description || "Sytacle subscription plan"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.prices.map((price) => {
                      const active = subscriptions.find(
                        (item) =>
                          item.priceId === price.id ||
                          item.productId === product.id,
                      );
                      return (
                        <button
                          key={price.id}
                          type="button"
                          onClick={() => subscribe(product.id, price.id)}
                          disabled={Boolean(active) || busy === price.id}
                          className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 disabled:opacity-60 dark:border-blue-900/60 dark:text-blue-400"
                        >
                          {active
                            ? active.status
                            : busy === price.id
                              ? "Subscribing..."
                              : `${money(price.amount, price.currency)} / ${price.interval}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="px-5 py-4 text-sm text-slate-500">
              No subscription plans are available.
            </p>
          )}
        </Card>
        <Card>
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Your subscriptions
            </h3>
          </div>
          {subscriptions.length ? (
            subscriptions.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.planName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {money(item.amount, item.currency)} / {item.interval} ·{" "}
                    {item.status}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                    {date(item.currentPeriodEnd)}
                  </span>
                  {!item.cancelAtPeriodEnd && item.status === "active" && (
                    <button
                      type="button"
                      onClick={() => cancel(item.id)}
                      disabled={busy === item.id}
                      className="text-xs font-medium text-rose-600 disabled:opacity-60 dark:text-rose-400"
                    >
                      {busy === item.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="px-5 py-4 text-sm text-slate-500">
              No active billing subscriptions.
            </p>
          )}
        </Card>
      </div>
    </Page>
  );
}

function PurchasesPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    import("../lib/accountApi.js")
      .then(({ getPurchases }) => getPurchases(user))
      .then((result) => setPurchases(result.purchases || []))
      .catch((err) => setError(friendlyAuthError(err)));
  }, [user]);
  return (
    <Page
      back
      icon={ReceiptText}
      title="Purchase history"
      subtitle="Review your previous purchases, receipts, and payment status."
    >
      <Message error={error} />
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {purchases.length ? (
          purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center gap-3 px-5 py-4"
            >
              <ReceiptText size={19} className="text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {purchase.description}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {date(purchase.purchasedAt)} · {purchase.status}
                </p>
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {money(purchase.amount, purchase.currency)}
              </span>
            </div>
          ))
        ) : (
          <p className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">
            No purchases yet.
          </p>
        )}
      </Card>
    </Page>
  );
}

const links = [
  [
    "billing",
    "Billing account",
    "Manage invoice and receipt details.",
    WalletCards,
  ],
  [
    "payment-methods",
    "Payment methods",
    "Manage cards and other payment methods.",
    CreditCard,
  ],
  [
    "subscriptions",
    "Subscriptions",
    "Choose plans and manage recurring services.",
    CreditCard,
  ],
  [
    "purchases",
    "Purchase history",
    "Review previous purchases and receipts.",
    ReceiptText,
  ],
];
function PaymentsHome() {
  return (
    <Page
      icon={CreditCard}
      title="Payments"
      subtitle="Choose a finance area to view or manage in detail."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(([path, title, description, Icon]) => (
          <Link key={path} to={`/account/payments/${path}`} className="group">
            <Card className="h-full p-5 transition hover:border-blue-300 dark:hover:border-blue-700">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="mt-1 text-slate-400 transition group-hover:translate-x-1"
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Page>
  );
}

function BillingEditor({ accountId }) {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    import("../lib/accountApi.js")
      .then(({ getBilling }) => getBilling(user))
      .then((result) =>
        setAccount(
          (result.accounts || []).find((item) => item.id === accountId) || null,
        ),
      )
      .catch((err) => setError(friendlyAuthError(err)));
  }, [user, accountId]);
  if (error)
    return (
      <Page
        back
        icon={WalletCards}
        title="Billing account"
        subtitle="Manage your saved billing details."
      >
        <Message error={error} />
      </Page>
    );
  if (!account) return <Loading />;
  return (
    <BillingForm
      user={user}
      account={account}
      onSaved={() => window.history.back()}
    />
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const parts = useLocation().pathname.split("/");
  const path = parts[3] || "";
  if (path === "billing" && parts[4] === "new")
    return <BillingForm user={user} onSaved={() => window.history.back()} />;
  if (path === "billing" && parts[4])
    return <BillingEditor accountId={parts[4]} />;
  if (path === "billing") return <BillingPage />;
  if (path === "payment-methods") return <PaymentMethodsPage />;
  if (path === "subscriptions" && parts[4])
    return <PlanDetailsPage planKey={parts[4]} />;
  if (path === "subscriptions") return <ClaimSubscriptionsPage />;
  if (path === "purchases") return <PurchasesPage />;
  return <PaymentsHome />;
}
