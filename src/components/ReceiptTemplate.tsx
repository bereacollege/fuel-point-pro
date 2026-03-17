import { format } from 'date-fns';

interface ReceiptItem {
  kg: number;
  amount: number;
}

interface ReceiptTemplateProps {
  items: ReceiptItem[];
  totalKg: number;
  totalAmount: number;
  customerType: string;
  date?: Date;
}

export function ReceiptTemplate({ items, totalKg, totalAmount, customerType, date }: ReceiptTemplateProps) {
  const d = date || new Date();
  return (
    <div className="w-[300px] text-center mx-auto font-mono text-sm">
      <h1 className="text-lg font-bold">RIMTECH GLOBAL SERVICES LTD</h1>
      <p className="text-xs">1, 7up Road, Ogborhill, Aba</p>
      <div className="my-3 border-t border-dashed border-foreground" />
      <div className="text-left text-xs space-y-0.5">
        <p>Date: {format(d, 'dd/MM/yyyy')}</p>
        <p>Time: {format(d, 'HH:mm:ss')}</p>
        <p>Customer: {customerType}</p>
      </div>
      <div className="my-3 border-t border-dashed border-foreground" />
      <table className="w-full text-xs text-left">
        <thead>
          <tr>
            <th>Item (KG)</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>{item.kg}kg</td>
              <td className="text-right">₦{item.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="my-3 border-t border-dashed border-foreground" />
      <div className="flex justify-between font-bold text-xs">
        <span>Total KG:</span>
        <span>{totalKg}kg</span>
      </div>
      <div className="flex justify-between text-base font-black">
        <span>TOTAL:</span>
        <span>₦{totalAmount.toLocaleString()}</span>
      </div>
      <div className="mt-6 text-[10px]">
        <p>Thank you for your patronage!</p>
        <p>Powered by Rimtech GasOS</p>
      </div>
    </div>
  );
}
