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
  name?: string
  cost: number
  // how many people you're paying for
  portionsPaying: number
  // how many people this was split with
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
  const [isProcessingReceipt, setIsProcessingReceipt] = useState<boolean>(false)
  const [receiptError, setReceiptError] = useState<string | undefined>("uh oh")

  const debt = (() => {
    let mySubtotal = 0
    for (const {cost, portionsPaying, totalPortions} of items) {
      const actualTotal = Math.max(1, Math.abs(totalPortions ?? 1))
      const proportion = (portionsPaying ?? 1) / actualTotal
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

  async function handleReceiptUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingReceipt(true)
    setReceiptError(undefined)

    try {
      console.log('Receipt selected:', file.name, file.type)
      
      // TODO: Implement receipt processing
      throw new Error('Receipt processing not supported yet')
    } catch (error) {
      console.error('Error processing receipt:', error)
      setReceiptError(error instanceof Error ? error.message : 'Failed to process receipt')
    } finally {
      setIsProcessingReceipt(false)
      // Reset the input so the same file can be selected again
      event.target.value = ''
    }
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
        
        <div className="items-container">
          {items.map((item, index) => {
            // Calculate the max split value across all items
            const maxSplit = Math.max(8, ...items.map(i => Math.abs(i.totalPortions ?? 1)))
            
            return (
              <div key={item.id} className="item-card">
                {(true || item.name) && (
                  <div className="item-name">{item.name ?? 'milkshake'}</div>
                )}
                
                <div className="item-controls">
                  <button 
                    className="btn btn-danger btn-sm btn-remove" 
                    onClick={() => removeItem(index)}
                  >
                    ×
                  </button>
                  
                  <div className="control-group">
                    <label className="control-label">Cost</label>
                    <div className="currency-input-wrapper">
                      <span className="currency-symbol">$</span>
                      <input
                        className="form-control form-control-sm currency-input"
                        name={`cost${index}`}
                        type="text"
                        inputMode="decimal"
                        onChange={(ev) => setItem(index, {cost: safeEval(ev.target.value, 1)})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="control-group">
                    <label className="control-label">Split?</label>
                    {(item.totalPortions ?? 1) < 0 || item.totalPortions === 0 ? (
                      <input
                        className="form-control form-control-sm"
                        type="number"
                        inputMode="numeric"
                        value={item.totalPortions === 0 ? '' : Math.abs(item.totalPortions ?? 1)}
                        onChange={(ev) => {
                          const value = ev.target.value
                          const newTotal = value === '' ? 0 : Number(value)
                          const actualTotal = Math.max(1, newTotal)
                          const newPaying = Math.min(item.portionsPaying ?? 1, actualTotal)
                          setItem(index, {totalPortions: newTotal === 0 ? 0 : -Math.abs(newTotal), portionsPaying: newPaying})
                        }}
                      />
                    ) : (
                      <select 
                        className="form-control portion-select"
                        value={item.totalPortions ?? 1}
                        onChange={(ev) => {
                          const value = ev.target.value
                          if (value === 'more') {
                            const newTotal = maxSplit + 1
                            const newPaying = Math.min(item.portionsPaying ?? 1, newTotal)
                            setItem(index, {totalPortions: -newTotal, portionsPaying: newPaying})
                          } else {
                            const newTotal = Number(value)
                            const newPaying = Math.min(item.portionsPaying ?? 1, newTotal)
                            setItem(index, {totalPortions: newTotal, portionsPaying: newPaying})
                          }
                        }}
                      >
                        <option value={1}>Just me</option>
                        {Array.from({length: maxSplit - 1}, (_, i) => i + 2).map(n => (
                          <option key={n} value={n}>{n} people</option>
                        ))}
                        <option value="more">...more</option>
                      </select>
                    )}
                  </div>
                  
                  <div className="control-group">
                    <label className="control-label">Paying for</label>
                    <select 
                      className="form-control portion-select"
                      value={item.portionsPaying ?? 1}
                      onChange={(ev) => setItem(index, {portionsPaying: Number(ev.target.value)})}
                    >
                      {Array.from({length: Math.max(1, Math.abs(item.totalPortions ?? 1))}, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n === 1 ? 'Just me' : `${n} people`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="action-buttons-container">
          <div className="action-buttons">
          <input
            type="file"
            id="receipt-upload"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptUpload}
            style={{ display: 'none' }}
            disabled={isProcessingReceipt}
          />
            <label htmlFor="receipt-upload" className={`btn btn-outline upload-button ${isProcessingReceipt ? 'disabled' : ''}`}>
              {isProcessingReceipt ? 'Processing...' : '📸 Upload Receipt'}
            </label>
            
            <button 
              className="btn btn-primary" 
              onClick={() => addItem()}
            >
              Add Item
            </button>
          </div>
          
          {receiptError && (
            <div className="error-message">{receiptError}</div>
          )}
        </div>
        
      </section>
      
      <section className="form-section">
        <h2 className="section-title">Bill Details</h2>
        <div className="form-group">
          <label className="form-label" htmlFor='sub'>Subtotal (Whole Bill)</label>
          <div className="currency-input-wrapper">
            <span className="currency-symbol">$</span>
            <input 
              className="form-control form-control-sm currency-input"
              name='sub' 
              type='text' 
              inputMode="decimal"
              onChange={(ev) => setSubtotal(Number.parseFloat(ev.target.value))} 
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor='total'>Total (Whole Bill)</label>
          <div className="currency-input-wrapper">
            <span className="currency-symbol">$</span>
            <input 
              className="form-control form-control-sm currency-input"
              name='total' 
              type='text' 
              inputMode="decimal"
              onChange={(ev) => setTotal(Number.parseFloat(ev.target.value))} 
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor='tip'>Tip</label>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <div className={tipIsRate ? "percent-input-wrapper" : "currency-input-wrapper"} style={{marginRight: '0.5rem'}}>
              {!tipIsRate && <span className="currency-symbol">$</span>}
              <input 
                className={`form-control form-control-sm ${tipIsRate ? 'percent-input' : 'currency-input'}`}
                name='tip' 
                type='number' 
                inputMode="decimal"
                defaultValue='20' 
                onChange={(ev) => setTip(Number.parseFloat(ev.target.value))} 
              />
              {tipIsRate && <span className="percent-symbol">%</span>}
            </div>
            
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
