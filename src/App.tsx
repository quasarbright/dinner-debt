import React, {CSSProperties, useState} from 'react';
import logo from './logo.svg';
import './App.css';

/*
items you're paying for:
cost: ___ proportion: ___ [remove item]
...
[add item]
subtotal (for the whole bill): ___
total (for the whole bill): ___
tip: _.2 [ ] flat [x] rate
discount: __0 [x] proportional [ ] custom proportion: ___
[submit]
You owe: $5.69
*/

interface Item {
  cost: number
  proportion: number
  id: string
}

const formFieldStyle: CSSProperties = {
  marginRight: 10
}

const formLineStyle: CSSProperties = {
  marginBottom: 20
}

const itemLineStyle: CSSProperties = {
  marginBottom: 10
}

const textInputStyle: CSSProperties = {
  width: 40
}


function App() {
  const [items, setItems] = useState<Partial<Item>[]>([])
  const [subtotal, setSubtotal] = useState<number>()
  const [total, setTotal] = useState<number>()
  const [tip, setTip] = useState<number>(0.2)
  const [tipIsRate, setTipIsRate] = useState<boolean>(true)
  // TODO discounts
  // const [discount, setDiscount] = useState<number>()
  // const [discountIsProportional, setDiscountIsProportional] = useState<boolean>(true)
  // const [discountCustomProportion, setDiscountCustomProportion] = useState<number>()

  const debt = (() => {
    let mySubtotal = 0
    for (const {cost, proportion} of items) {
      mySubtotal += (cost ?? 0) * (proportion ?? 1)
    }
    const tax = (total ?? mySubtotal) - (subtotal ?? mySubtotal)
    const tipCost = tipIsRate ? (total ?? subtotal ?? mySubtotal) * tip : tip
    const fees = tax + tipCost
    const myRatio = mySubtotal / (subtotal ?? mySubtotal)
    const myFees = fees * myRatio
    // console.log({mySubtotal, subtotal, total, tax, tipCost, fees, myRatio})
    return mySubtotal + myFees
  })();

  function setItem(index: number, item: Partial<Item>) {
    setItems(items => {
      const newItems = items.slice()
      newItems[index] = {...items[index], ...item}
      return newItems
    })
  }

  function removeItem(index: number) {
    setItems(items => {
      const newItems = items.slice()
      newItems.splice(index, 1)
      return newItems
    })
  }

  /// left off about to do remove item
  return (
      <div style={{padding: 10}}>
        <h1>Dinner Debt</h1>
        <div style={formLineStyle}>
          <div style={formLineStyle}>
            Items you're paying for:
          </div>
          {items.map((item, index) => (
              <div key={item.id} style={itemLineStyle}>
                <label htmlFor={`cost${index}`}>Cost: </label>
                <input
                    name={`cost${index}`}
                    onChange={(ev) => setItem(index, {cost: safeEval(ev.target.value, 1)})}
                    style={{...formFieldStyle, ...textInputStyle}}
                />
                <label htmlFor={`proportion${index}`}>Proportion: </label>
                <input
                    name={`proportion${index}`}
                    defaultValue='1'
                    onChange={(ev) => setItem(index, {proportion: safeEval(ev.target.value, 1)})}
                    style={{...formFieldStyle, ...textInputStyle}}
                />
                <button onClick={() => removeItem(index)}>Remove item</button>
              </div>
          ))}
          <button onClick={() => setItems(items => [...items, {proportion: 1, id: crypto.randomUUID()}])}>Add item</button>
        </div>
        <div style={formLineStyle}>
          <label htmlFor='sub'>Subtotal (for the whole bill): </label>
          <input name='sub' type='number' onChange={(ev) => setSubtotal(Number.parseFloat(ev.target.value))} style={textInputStyle}/>
        </div>
        <div style={formLineStyle}>
          <label htmlFor='total'>Total (for the whole bill): </label>
          <input name='total' type='number' onChange={(ev) => setTotal(Number.parseFloat(ev.target.value))} style={textInputStyle}/>
        </div>
        <div style={formLineStyle}>
          <label htmlFor='tip'>Tip: </label>
          <input name='tip' type='number' defaultValue='0.2' onChange={(ev) => setTip(Number.parseFloat(ev.target.value))} style={textInputStyle}/>
          <input name="tipIsRate" type="radio" checked={tipIsRate} onClick={() => setTipIsRate(true)}/>
          <label htmlFor="tipIsRate">rate</label>
          <input name="tipisFlat" type="radio" checked={!tipIsRate} onClick={() => setTipIsRate(false)}/>
          <label htmlFor="tipIsFlat">flat</label>
        </div>
        <p>You owe: {Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(debt)}</p>
      </div>
  );
}

function safeEval(expr: string, defaultValue: any) {
  try {
    return eval(expr)
  } catch (ignored) {
    return defaultValue
  }
}

export default App;
