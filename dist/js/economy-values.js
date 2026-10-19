// One price book for actual cooperative purchases and opportunity-cost previews.
export const MATERIAL_PRICES = {ore:4,cloth:2,wood:2,stone:2,hide:5,crystal:9};
export const materialValue = materials => Object.entries(materials || {}).reduce((n,[id,count])=>n+(MATERIAL_PRICES[id] || 0)*count,0);
export function gearSaleValue(item,merchant=null) {
  const rate=item.crafted?.45:({uncommon:.5,rare:.55,epic:.6,legendary:.65}[item.quality] || .45);
  return Math.max(1,Math.floor((item.crafted?item.price:merchant?.prices?.[item.id] || item.price)*rate));
}
export function returnQuote({materials={},fee=0,days=0,receipt=0,living=0}={}) {
  const inputs=materialValue(materials),cashNet=receipt-fee-living;
  return {materials:{...materials},materialValue:inputs,fee,days,receipt,living,cashNet,netValue:cashNet-inputs};
}
