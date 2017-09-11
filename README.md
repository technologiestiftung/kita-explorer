# kita-explorer
Kindertagesstätten (Kitas) Berlin 


## Scraper

If no search parameters are attached, the following page contains all Kitas from the offical city record

```
https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kitas/verzeichnis/ListeKitas.aspx?aktSuchbegriff=
```

Within the document the data is structured as follows (instead of using classes every field has a unique id, yes this means this document has 12770 unique ids and we cannot check for class names and instead need to parse ids):

```
#DataList_Kitas tbody td
  > a = Link to Details also contains the ID of the item
  span
    id contains KitaNr = Kita number (official id, i guess)
    id contains TraegerName = Kita's parent organisation
    id contains KitaAdresse = address
    id contains Ortsteil = city district
```

to enricht the meta data of each Kita, the next step will parse the details page of each Kita. Some of the following fields will be empty.

```
#lblEinrichtungsart = Kita type
#lblTraegerart = type of Kita's parent organisation
#HLinkStadtplan = Link to city map (this contains the postcode)
#lblTelefon = phone number
#HLinkEMail = email
#HLinkWeb = url website
#imgKita = 'https://www.berlin.de/sen/jugend/familie-und-kinder/kindertagesbetreuung/kitas/verzeichnis/' + ImageURL
#lblPaedSchwerpunkte = educational concept
#lblThemSchwerpunkte = thematic foci
#lblMehrsprachigkeit = languages
```

Opening Times (remove b-tag, which holds the short day)

```
#lblOeffnungMontag
#lblOeffnungDienstag
#lblOeffnungMittwoch
#lblOeffnungDonnerstag
#lblOeffnungFreitag
```

Age structure and places

```
#GridViewPlatzstrukturen tbody tr:1
  td:0 = overall {int}
  td:1 = under 3 years of age {int}
  td:2 = over 3 years of age {int}
  td:3 = minimum age to be accepted (in month) {int}
  td:4 = age mix {text}
```

Available places (might be empty)
```
if(#GridViewFreiPlaetze tbody tr td.length == 1) > empty

#GridViewFreiPlaetze
  td:0 = acceptance age (in month)
  td:1 = all ages
  td:2 = over 3 years of age
  td:3 = under 3 years of age
  td:4 = daily hours
  td:5 = available from (date)
  td:6 = comment
  td:7 = whatever
```

Open positions (might be empty)

```
if(#GridViewStellenangebote tbody tr td.length == 1) > empty

#GridViewStellenangebote tbody tr:>0 
  td:0 = Position text
  td:1 = Position date
```