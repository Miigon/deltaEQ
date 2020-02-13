# deltaEQ

## What is it?
deltaEQ - a utility that generates EQ profile to make your headphone sound like another headphone, or neutral.

## How does it work?
deltaEQ works by extracting frequency response data from [rtings.com](https://www.rtings.com), working out the differences between two headphones, then turning them into EQ profiles that can be used by equalizers.

## What's the requirements?
To use deltaEQ, both the existing headphone and the target headphone **_must_**
- **have already been tested on rtings.com.**

## What to expect, and what not to expect?
deltaEQ **_will_**
- give you an idea of how a particular headphone may sound like before purchasing it.

deltaEQ **_won't_**
- turn your closed-back headphone into an open-back one.
- turn your $10 crap earbud into a Sennheiser IE800S.
- make your bass-lacking headphone start producing bass. (eg. Sennheiser HD598)  
  (at least not without a lot of distortion)
- be ideal for high-frequencies  
  (it's more susceptible to wearing condition and production tolerance)

To get better results, your existing headphone **_should_**
- be the same type of headphone as your target headphone. (in-ear, on-ear, over-ear, etc...) (open-back, closed-back)
- have relatively low distortion level throughout the whole frequency spectrum.
- can already produce a good amount of bass.
- already have an relatively flat and accurate response, especially on the high frequencies.

### What would work best and what wouldn't (from best to worst)
- open-back monitor headphones with good amount of bass  (eg. Sennheiser HD800)
- open-back monitor headphones  (eg. Sennheiser HD650/HD600/HD598, Beyerdynamic DT990)
- closed-back monitor headphones  (eg. AKG K371, Beyerdynamic DT990)
- in-ear monitor with good response and a tight fit (good isolation)  (eg. Sennheiser IE80/IE80S/IE800)
- regular closed-back headphones
- regular open-back headphones
- in-ear earbud with poor response and isolation  (eg. Earpods, Airpods)

## How to use it?
NOTICE: the project is at a very early stage, API might change frequently.

This project is at it's early stage, and currently only runs under node.js:
```javascript
deltaeq = require("./deltaeq")
eqArray = deltaeq.getDeltaEQArrayByModel("wh1000xm2","dt990")
deltaeq.generateEQProfileForSoftware(eqArray,"eqmac2-31band")
```
`wh1000xm2` is the headphone you are listening with, while `dt990` is the headphone you want to test out.  
`eqmac2-31band` is the equalizer you want to use, currently supported equalizers:
- `eqmac2-31band`: (eqMac2)[https://bitgapp.com/eqmac/] 31-band equalizer for macOS
- `eqe-lua`: (EQE)[https://eqe.fm] global equalizer for jailbroken iOS devices
  
if you want to checkout more headphone models, you have to download the corresponding frequency response data json file:
1. download `https://www.rtings.com/images/graphs/[BRAND]/[MODEL]` (brand and model see `rtings-all.txt`)
2. rename it to `xxx.frg.json`('xxx' being the model name), and put it under the same folder as deltaeq.js
3. replace 'wh1000xm2' or 'dt990' with 'xxx'(the file name you've chosen)

