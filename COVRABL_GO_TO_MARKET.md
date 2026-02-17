# Covrabl — Go-to-Market Playbook
## For a self-funded, solo founder taking a working product to market

---

## PART 1: WHAT YOU HAVE (Honest Assessment)

You have a working product that:
- Lets users upload insurance documents and auto-extracts key data
- Organizes policies by personal/business with grouping
- Provides emergency access cards (ICE) with shareable links
- Supports trusted sharing with family/caregivers/attorneys
- Tracks renewals, claims, premiums, and coverage details
- Works as a PWA (installable on phones)
- Has a clean, professional UI with a strong landing page

What this means: You are NOT at idea stage. You have a deployed, functional product. That puts you ahead of 90% of people who talk about launching something. The gap between where you are and "market-ready" is smaller than you think.

---

## PART 2: WHAT NEEDS TO HAPPEN BEFORE LAUNCH

### Must-Have (Week 1-2)

1. **Domain + Email**
   - Register covrabl.com (research showed it's likely available)
   - Set up a professional email: hello@covrabl.com or support@covrabl.com
   - Point your Vercel deployment to covrabl.com
   - Cost: ~$12/year for domain, free email with Zoho or ~$6/month with Google Workspace

2. **Terms of Service + Privacy Policy**
   - Use a generator like Termly.io or TermsFeed.com ($15-50 one-time)
   - You MUST have these before collecting user data commercially
   - Key points to cover: you don't sell data, users own their data, encryption in transit/at rest
   - Add links to footer of your app (you already have a Privacy page — expand it)

3. **Password Reset Flow**
   - Users will forget passwords. If this doesn't exist yet, it's a blocker.
   - Basic email-based reset flow

4. **Payment Infrastructure**
   - Stripe is the standard. Create a Stripe account (free to set up, they take ~2.9% + $0.30 per transaction)
   - Start with a simple subscription: free trial → paid
   - You can use Stripe's hosted checkout — no need to build a custom payment page
   - Stripe also handles receipts, subscription management, cancellations

5. **Basic Onboarding**
   - After first signup, a simple 2-3 screen walkthrough: "Upload your first policy" → "See your extracted data" → "Share with someone you trust"
   - This is the difference between a user signing up and a user actually using the product

### Should-Have (Week 3-4)

6. **Email notifications**
   - Welcome email after signup
   - Renewal reminders (this is a huge value-add and retention driver)
   - Use a service like Resend, SendGrid, or Postmark (all have free tiers)

7. **Mobile polish pass**
   - Test every screen on an actual phone
   - Make sure the Add Policy flow, emergency card, and ICE card view all work well on mobile
   - Most users will interact with this on their phone

8. **Error handling and edge cases**
   - What happens when extraction fails? (Show a graceful fallback with manual entry)
   - What happens when a PDF is not a policy? (Handle it)
   - What happens with a slow connection? (Loading states)

### Nice-to-Have (After Launch)

9. **Business organization improvements**
   - Folders/sub-groups within business category (you mentioned this — it's a real need but can come post-launch)

10. **Analytics**
    - Add something simple like Plausible (privacy-friendly, $9/month) or free Vercel Analytics
    - You need to know: how many signups, how many upload a policy, how many create an ICE card

---

## PART 3: MONETIZATION

### Recommended Model: Freemium with Subscription

**Free Tier:**
- Up to 3 policies
- Basic extraction
- 1 emergency card
- Standard sharing

**Pro Tier ($7.99/month or $69.99/year):**
- Unlimited policies
- Unlimited emergency cards
- Priority extraction
- Business organization (folders, entities)
- Renewal email reminders
- Export to PDF
- Family sharing (up to 5 members)

**Why this model:**
- Free tier lets people try it with zero friction (critical for a new, unknown brand)
- 3 policies is enough to see the value but not enough for anyone with real coverage needs
- The upgrade trigger is natural: "I have more than 3 policies" (most households do)
- $7.99/month is an easy yes for someone managing $50K+ in annual premiums
- Annual pricing gives you cash upfront and reduces churn

**Why NOT other models:**
- Don't do per-policy pricing (feels nickle-and-dime-y)
- Don't do one-time payment (you need recurring revenue, and users need ongoing value)
- Don't do ads (destroys trust for a product handling sensitive financial data)
- Don't do data monetization (this is your competitive advantage — privacy)

### Revenue Math (Realistic)

- 1,000 free signups → ~50 convert to paid (5% conversion, which is standard for freemium)
- 50 users x $7.99/month = $399.50/month MRR
- That's ~$4,800/year from your first 1,000 signups
- At 10,000 free users with 5% conversion: ~$48,000/year
- These are conservative numbers. Good freemium products convert at 5-10%.

---

## PART 4: WHO TO GET HELP FROM

### What you DON'T need:
- A co-founder (not yet — you have a working product)
- A development agency (you have Claude Code)
- A marketing agency (too expensive, too early)
- Venture capital (you don't need to give up equity at this stage)

### What you DO need:

1. **A lawyer (one-time, 2-3 hours)**
   - Insurance data has regulatory implications that vary by state
   - A business attorney can review your Terms of Service, advise on LLC formation (if you haven't already), and flag any insurance-specific regulations
   - Cost: $300-600 for a consultation
   - Where to find: LegalZoom for entity formation, or a local business attorney
   - You are NOT an insurance company or broker — you are a document management tool. This distinction matters legally and should be clear in your terms.

2. **A designer (contract, one-time)**
   - Your UI is functional and clean, but for launch you'll want:
     - A proper logo (not just text)
     - App store screenshots if you submit to app stores
     - Social media assets (banner for Twitter/LinkedIn, a few promo images)
   - Cost: $200-500 on Fiverr or $500-1500 on 99designs
   - This is a one-time cost, not ongoing

3. **Beta testers (free)**
   - You need 10-20 real people using the product before public launch
   - Sources: friends, family, Reddit (r/insurance, r/personalfinance), local Facebook groups
   - Their feedback will surface the real issues (confusing flows, missing features, bugs)
   - Give them free Pro access for life in exchange for honest feedback

4. **An accountant (when revenue starts)**
   - Once you're collecting money, you need someone handling sales tax (Stripe can automate most of this), income reporting, and business expenses
   - Not needed until you have paying customers

---

## PART 5: GO-TO-MARKET (Getting the Word Out)

### Phase 1: Soft Launch (Week 1-2)

**Goal: Get 50-100 real signups and validate the product works**

1. **Personal network**
   - Email/text everyone you know: "I built this thing, would you try it and give me honest feedback?"
   - You need real users with real policies testing real flows
   - Don't be shy about this — people respect builders

2. **Reddit**
   - r/personalfinance (1M+ members) — post about the problem, not the product: "How do you all organize your insurance policies? I got tired of digging through emails so I built something"
   - r/insurance — more niche but highly relevant audience
   - r/smallbusiness — for the business policy organization angle
   - r/SideProject — supportive community for indie builders
   - Rule: Be genuine. Share the story. Don't spam.

3. **Product Hunt**
   - Free to launch, can drive 500-2000 visits in a day
   - Prepare: good screenshots, a 1-minute demo video (use Loom, it's free), clear one-liner
   - Best day to launch: Tuesday or Wednesday
   - This is a one-shot thing — do it when you're confident the product is solid

### Phase 2: Content + SEO (Month 1-3)

**Goal: Build organic traffic that compounds over time**

4. **Blog / Content (on your site)**
   - Write 2-4 articles per month on topics people actually Google:
     - "What to do after a car accident — insurance checklist"
     - "How to organize your family's insurance policies"
     - "What is a declarations page and why you need it"
     - "How to share insurance info with your spouse/parents/adult children"
   - These rank on Google over time and bring in people who have the exact problem you solve
   - Each article ends with a soft CTA: "Covrabl organizes all of this for you — try it free"

5. **Social media (pick ONE, not all)**
   - LinkedIn is probably your best bet for this product:
     - Insurance professionals, financial advisors, and organized adults
     - Post about the problem you're solving, share your building journey
     - "I realized after a fender bender that I couldn't find my policy number. So I built an app."
   - Don't try to be on Twitter AND Instagram AND TikTok AND LinkedIn. Pick one and be consistent.

### Phase 3: Partnerships (Month 3-6)

**Goal: Get distribution through people who already talk to your users**

6. **Insurance agents and brokers**
   - They would LOVE a tool that makes their clients more organized
   - Pitch: "Give your clients a free Covrabl account. They upload their policies, you look like a hero, they stay organized, everyone wins."
   - This is a long-term channel but extremely powerful if it works
   - Start with 2-3 local agents. Buy them coffee. Show them the product.

7. **Financial advisors / estate planners**
   - The emergency sharing feature is DIRECTLY relevant to estate planning
   - "Make sure your family can access your insurance information if something happens to you"
   - This is an emotional pitch that resonates immediately

8. **Emergency preparedness communities**
   - FEMA recommends having insurance documents accessible
   - Prepper communities, hurricane/wildfire-prone area groups
   - The ICE card feature is tailor-made for this audience

### The Viral Loop You Already Have

Your product has a built-in viral mechanism that most startups would kill for:

- User creates an ICE card → shares link with spouse/parent/child
- That person sees Covrabl for the first time in a real, emotional context
- They think: "I should do this too"
- They sign up

This is organic, free, and authentic. Every ICE card shared is a marketing touch. Make sure the ICE card page has a clear "Create your own" CTA.

---

## PART 6: WHAT NOT TO DO

1. **Don't build more features before launching.** You have enough. The next feature should be driven by user feedback, not imagination.

2. **Don't spend money on ads.** Not until you know your conversion funnel works. Ads amplify what's already working — they don't fix what isn't.

3. **Don't pitch to VCs.** Not yet. At this stage, VC money comes with pressure to scale before you've found product-market fit. Self-funded means you can move at the right pace.

4. **Don't compare yourself to funded startups.** Marble raised millions and got acquired. Lemonade is public. You're not competing with them — you're solving a different problem (organization + access, not buying insurance).

5. **Don't over-engineer.** Resist the urge to add AI monitoring, carrier integrations, or premium comparison tools. Those are Phase 2+ features after you've validated that people will pay for what you already have.

6. **Don't wait until it's perfect.** It won't be. Ship, learn, iterate.

---

## PART 7: 90-DAY TIMELINE

### Week 1-2: Pre-Launch
- [ ] Register covrabl.com, point DNS
- [ ] Set up professional email
- [ ] Add Terms of Service + Privacy Policy
- [ ] Implement password reset (if not done)
- [ ] Set up Stripe with free/Pro tiers
- [ ] Mobile polish pass
- [ ] Get a logo designed

### Week 3-4: Soft Launch
- [ ] Invite 20 beta testers (friends, family, Reddit)
- [ ] Collect feedback aggressively (what's confusing? what's missing? what's broken?)
- [ ] Fix the top 5 issues they surface
- [ ] Add basic analytics

### Month 2: Public Launch
- [ ] Launch on Product Hunt
- [ ] Post on Reddit (r/personalfinance, r/insurance, r/smallbusiness)
- [ ] Start LinkedIn presence (1-2 posts per week)
- [ ] Publish first 2 blog articles
- [ ] Add "Create your own" CTA to ICE card page (viral loop)

### Month 3: Growth
- [ ] Analyze: who signed up? who converted? who churned? why?
- [ ] Reach out to 5 local insurance agents
- [ ] Publish 2 more blog articles
- [ ] Implement the top 3 features users actually asked for
- [ ] Set revenue target: 25 paying users by end of Month 3

---

## PART 8: THE PITCH (How to Describe Covrabl)

**One-liner:**
"Covrabl organizes all your insurance in one place — so you and the people you trust always have the information you need."

**Elevator pitch (30 seconds):**
"Most people have 5-10 insurance policies scattered across emails, portals, and filing cabinets. When something actually happens — a car accident, a house fire, a medical emergency — they can't find their policy number, their deductible, or their claims phone number. Covrabl fixes that. You upload your policies, we extract the important details, and you get a single organized view of everything you're covered for. You can also create emergency cards that your family can access without logging in. It's $8 a month and takes 5 minutes to set up."

**The emotional hook (for marketing):**
"If something happened to you tonight, could your family find your insurance information?"

---

## Summary

You have a real product that solves a real problem. The path to market is:

1. Spend 2 weeks on launch prep (domain, payments, legal basics, polish)
2. Get 20 real users and listen to them
3. Launch publicly and start telling people about it
4. Let the emergency sharing feature do your marketing for you
5. Iterate based on what users actually want

The biggest risk isn't the product. The product works. The biggest risk is waiting too long to ship it.
