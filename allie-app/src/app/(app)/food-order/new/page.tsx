import NewFoodOrderForm from "./NewFoodOrderForm";

export default function NewFoodOrderPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">🍱 New Food Order</h1>
        <p className="text-sm text-ink-soft mt-1">
          Paste a ShopeeFood or Grab link to start a group order session
        </p>
      </div>
      <NewFoodOrderForm />
    </div>
  );
}
