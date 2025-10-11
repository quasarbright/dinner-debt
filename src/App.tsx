import React, {useState} from 'react';
import './App.css';
import QRCode from 'react-qr-code';

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
  portionsPaying: number
  totalPortions: number
  id: string
}

function emptyItem(): Partial<Item> {
  return {portionsPaying: 1, totalPortions: 1, id: crypto.randomUUID()}
}

function App() {
  const [items, setItems] = useState<Partial<Item>[]>([emptyItem()])
  const [subtotal, setSubtotal] = useState<number>()
  const [total, setTotal] = useState<number>()
  const [tip, setTip] = useState<number>(20)
  const [tipIsRate, setTipIsRate] = useState<boolean>(true)
  // TODO discounts
  // const [discount, setDiscount] = useState<number>()
  // const [discountIsProportional, setDiscountIsProportional] = useState<boolean>(true)
  // const [discountCustomProportion, setDiscountCustomProportion] = useState<number>()
  const [isPayingMe, setIsPayingMe] = useState<boolean>(false)
  const [showQRCode, setShowQRCode] = useState<boolean>(false)

  const debt = (() => {
    let mySubtotal = 0
    for (const {cost, portionsPaying, totalPortions} of items) {
      const proportion = (portionsPaying ?? 1) / (totalPortions ?? 1)
      mySubtotal += (cost ?? 0) * proportion
    }
    const tax = (total ?? mySubtotal) - (subtotal ?? mySubtotal)
    const tipCost = tipIsRate ? (total ?? subtotal ?? mySubtotal) * tip / 100 : tip
    const fees = tax + tipCost
    const myRatio = mySubtotal / (subtotal ?? mySubtotal)
    if (!(subtotal || mySubtotal)) {
      return 0
    }
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

  function addItem() {
    setItems(items => [...items, {portionsPaying: 1, totalPortions: 1, id: crypto.randomUUID()}])
  }

  const debtStr = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(debt)
  const amountStr = debtStr.substring(1); // remove the dollar sign for Venmo
  const note = encodeURIComponent("dinner-debt")

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Dinner Debt</h1>
        <p className="app-description">
          Calculate how much you owe someone for dinner,
          including your portion of the tax and tip based on what you ordered.
        </p>
      </header>
      
      <section className="form-section">
        <h2 className="section-title">Items</h2>
        
        {items.map((item, index) => (
          <div key={item.id} className="item-row">
            <div className="form-group">
              <label className="form-label" style={{opacity: 0}}>×</label>
              <button 
                className="btn btn-danger btn-sm btn-remove" 
                onClick={() => removeItem(index)}
              >
                ×
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor={`cost${index}`}>Cost</label>
              <input
                className="form-control form-control-sm"
                name={`cost${index}`}
                type="text"
                inputMode="decimal"
                onChange={(ev) => setItem(index, {cost: safeEval(ev.target.value, 1)})}
                placeholder="0.00"
              />
            </div>
            
            <div className="form-group portion-group">
              <div className="portion-controls">
                <div className="counter-wrapper">
                  <label className="form-label portion-label">Split?</label>
                  <div className="counter-control">
                    {(item.totalPortions ?? 1) > 1 && (
                      <button 
                        className="counter-btn"
                        onClick={() => {
                          const newTotal = Math.max(1, (item.totalPortions ?? 1) - 1)
                          const newPaying = Math.min(item.portionsPaying ?? 1, newTotal)
                          setItem(index, {totalPortions: newTotal, portionsPaying: newPaying})
                        }}
                      >
                        -
                      </button>
                    )}
                    <span className={`counter-display ${(item.totalPortions ?? 1) === 1 ? 'is-text' : 'is-number'}`}>
                      {(item.totalPortions ?? 1) === 1 ? 'Just me' : (
                        <>
                          {item.totalPortions ?? 1}
                          <svg className="people-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                          </svg>
                        </>
                      )}
                    </span>
                    <button 
                      className="counter-btn"
                      onClick={() => setItem(index, {totalPortions: (item.totalPortions ?? 1) + 1})}
                    >
                      +
                    </button>
                  </div>
                </div>
                
                {(item.totalPortions ?? 1) > 1 && (
                  <>
                    <div className="portion-divider"></div>
                    <div className="counter-wrapper">
                      <label className="form-label portion-label">Paying for</label>
                      <div className="counter-control counter-paying">
                      {(item.portionsPaying ?? 1) > 1 && (
                        <button 
                          className="counter-btn"
                          onClick={() => setItem(index, {portionsPaying: Math.max(1, (item.portionsPaying ?? 1) - 1)})}
                        >
                          -
                        </button>
                      )}
                      <span className={`counter-display ${(item.portionsPaying ?? 1) === 1 ? 'is-text' : 'is-number'}`}>
                        {(item.portionsPaying ?? 1) === 1 ? 'Just me' : (
                          <>
                            {item.portionsPaying ?? 1}
                            <svg className="people-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                            </svg>
                          </>
                        )}
                      </span>
                      <button 
                        className="counter-btn"
                        onClick={() => setItem(index, {portionsPaying: Math.min((item.totalPortions ?? 1), (item.portionsPaying ?? 1) + 1)})}
                        disabled={(item.portionsPaying ?? 1) >= (item.totalPortions ?? 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <button 
          className="btn btn-primary" 
          onClick={() => addItem()}
        >
          Add Item
        </button>
        
      </section>
      
      <section className="form-section">
        <h2 className="section-title">Bill Details</h2>
        <div className="form-group">
          <label className="form-label" htmlFor='sub'>Subtotal (Whole Bill)</label>
          <input 
            className="form-control form-control-sm"
            name='sub' 
            type='number' 
            inputMode="decimal"
            onChange={(ev) => setSubtotal(Number.parseFloat(ev.target.value))} 
            placeholder="0.00"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor='total'>Total (Whole Bill)</label>
          <input 
            className="form-control form-control-sm"
            name='total' 
            type='number' 
            inputMode="decimal"
            onChange={(ev) => setTotal(Number.parseFloat(ev.target.value))} 
            placeholder="0.00"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor='tip'>Tip</label>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <input 
              className="form-control form-control-sm"
              name='tip' 
              type='number' 
              inputMode="decimal"
              defaultValue='20' 
              onChange={(ev) => setTip(Number.parseFloat(ev.target.value))} 
              style={{marginRight: '0.5rem'}}
            />
            
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  className="radio-input"
                  name="tipIsRate" 
                  type="radio" 
                  checked={tipIsRate} 
                  onClick={() => setTipIsRate(true)}
                />
                percent
              </label>
              
              <label className="radio-label">
                <input 
                  className="radio-input"
                  name="tipisFlat" 
                  type="radio" 
                  checked={!tipIsRate} 
                  onClick={() => setTipIsRate(false)}
                />
                flat amount
              </label>
            </div>
          </div>
        </div>
      </section>
      
      <section className="result-section">
        <h2 className="section-title">Result</h2>
        <div className="result-amount">You owe: {debtStr}</div>
        
        <div className="form-group">
          <p>Are you paying Mike Delmonaco?</p>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                className="radio-input"
                name="not-paying-me" 
                type="radio" 
                checked={!isPayingMe} 
                onClick={() => setIsPayingMe(false)}
              />
              No
            </label>
            
            <label className="radio-label">
              <input 
                className="radio-input"
                name="paying-me" 
                type="radio" 
                checked={isPayingMe} 
                onClick={() => setIsPayingMe(true)}
              />
              Yes
            </label>
          </div>
        </div>
        
        {isPayingMe ? (
          <a 
            className="action-button venmo-button" 
            href={`https://venmo.com/?txn=pay&amount=${amountStr}&note=${note}&recipients=@Mike-Delmonaco`}
          >
            Pay Mike Delmonaco with Venmo
          </a>
        ): (
          <a 
            className="action-button venmo-button" 
            href={`https://venmo.com/?txn=pay&amount=${amountStr}&note=${note}`}
          >
            Pay with Venmo
          </a>
        )}
      </section>
      
      <section className="form-section">
        <div 
          className="qr-toggle"
          onClick={() => setShowQRCode(b => !b)}
        >
          {showQRCode ? '▼ Hide QR Code' : '▶ Show QR Code'}
        </div>
        
        {showQRCode && (
          <div className="qr-container">
            <QRCode 
              value={window.location.href}
              bgColor="var(--background-secondary)"
              fgColor="#dcddde"
              level="M"
            />
          </div>
        )}
      </section>
      
      <footer className="app-footer">
        Created by Mike Delmonaco
        <br/>
        <a href="https://github.com/quasarbright/dinner-debt">Source Code</a>
      </footer>
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
