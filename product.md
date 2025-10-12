# Dinner Debt Product Design

This is dinner debt, a website for helping you split the bill at dinner.

## Use-Cases/High Level Flows

### main payer wants people to pay them back for what they owe

I am paying for dinner with friends and want them to venmo me what they owe. They've never heard of dinner debt.

I open up dinner debt, scan the receipt, specify I'm the one getting venmo'ed, dinner debt fills out the receipt details, I specify which items were split.
I tell my friends to scan the QR code for a link or send them the link, this link prefills the receipt details.
I tell them to x out what they didn't eat and select how many people they're paying for on split items, they click "pay with venmo", it takes them to the venmo app with the price and recipient pre-filled, and then they venmo me how much they owe.

### non-main payer just wants to calculate how much they owe someone

I just had dinner with friends. Someone else is paying and I want to pay them how much I owe them. They don't know what dinner debt is and they don't care, they just trust me to venmo them the correct amount and I want to figure out how much I owe them.

I open up dinner debt, scan the receipt, specify I'm not the one getting venmo'ed, dinner debt fills out receipt details, I x out things that I didn't eat, I specify which items were split and how many people I'm paying for. I click "pay with venmo" and it takes me to the venmo app with the price (but not the recipient) prefilled, select a recipient, and pay them.

## Design considerations

- almost all users will be on mobile, so everything should be designed mobile-first
- one of the use-cases involves a lot of people who have never heard of dinner-debt using it, so getting them on dinner-debt must be a quick and smooth experience
- users are probably lazy/impatient and possibly drunk, so ux for people who owe the primary payer needs to be as seamless, intuitive, simple, and fool-proof as possible.
  - Having them scan a qr code or click on a link is easy enough, and the less they have to do or understand, the better. They should be able to use this without ever having seen it before, and the main payer shouldn't have to tell them anything. What they have to do should be obvious.
  - Requiring users make an account is too much friction. Want it to be quick.
  - Requiring users to download an app is too much friction. A website is quick and accessible via a link or qr code, low-commitment.
  - The less stuff users (especially friends of the main payer) have to fill in, the better