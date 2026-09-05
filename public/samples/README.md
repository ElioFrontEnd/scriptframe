# Sample sets for the landing page

Drop real Cutframe output in here, one folder per style id:

    public/samples/handdrawn-educational/01.jpg
    public/samples/handdrawn-educational/02.jpg
    ...

The landing-page gallery picks them up on the next build. A style with no
folder shows its palette panel instead, so a half-filled gallery still looks
deliberate.

The easy way, after downloading a job's ZIP and unzipping it:

    node scripts/add-samples.mjs "C:\Users\Pozitron\Downloads\my-video" handdrawn-educational

Pick a run of consecutive frames rather than the six prettiest ones — the claim
being made is that a whole set holds one look, and consecutive frames prove it.

Only put real output here. Images the app didn't produce would misrepresent the
product to someone deciding whether to pay for it.
