# Olive orchard intensification 
Navarro, R., Wirkus, L., Dubovyk, O. (2023) Spatio-temporal assessment of olive orchard intensification in the Saïss Plain (Morocco) using k-means and high-resolution satellite data

Olive orchard intensification has transformed an originally drought-resilient tree crop into a competing water user in semi-arid regions. In our study, we used remote sensing to evaluate whether intensive olive plantations have increased between 2010 and 2020, contributing to the current risk of aquifer depletion in the Saïss plain in Morocco. We developed an unsupervised approach based on the principles of hierarchical clustering and used for each year of analysis two images (5 m pixel size) from the PlanetLabs archive. We first calculated area-based accuracy metrics for 2020 with reference data, reaching a user’s accuracy of 0.95 and a producer’s accuracy of 0.89. For 2010, we verified results among different plot size ranges using available 2010 Google Earth Imagery, reaching high accuracy among the 50 largest plots (correct classification rate, CCR, of 0.94 in 2010 and 0.92 in 2020) and lower accuracies among smaller plot sizes. This study allowed us to map super-intensive olive plantations, thereby addressing an important factor in the groundwater economy of many semi-arid regions. Besides the expected increase in plantation size and the emergence of new plantations, our study revealed that some plantations were also given up, despite the political framework encouraging the opposite

### Keywords: super high-density olive plantations; land use land cover mapping; Google Earth Engine; unsupervised classification; hierarchical divisive clustering; remote sensing
--------------------------------------------------------------------------------------------------------------------------------------------------------
The code for the here developed approach can be found in the [GEE-code.js](GEE-code.js) file or accessed directly in Google Earth Engine via:
* https://code.earthengine.google.com/?accept_repo=users/rebeccanavarrokhoury/MDPI_RS
* git clone https://earthengine.googlesource.com/users/rebeccanavarrokhoury/MDPI_RS

You will also find available the [code](ReferenceDataCollector.js) for the [reference data collection tool](https://rebeccanavarrokhoury.users.earthengine.app/view/referencedatacollector) developed during this study. 

-----------------------------------------------------------------------------------------------------------------------------------------------------------
