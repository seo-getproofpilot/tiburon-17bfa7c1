/* Where to find Tiburón: one record per place, grouped by region (a U.S. state or a country).
   Add retail stores here as Basil sends them (his Georgia list from Beverage South is still to come):
   { region:'Georgia', kind:'Retail', name:'Store name', city:'City, ST', addr:'Street, City, ST ZIP', phone:'(000) 000-0000', tel:'+10000000000',
     lat:00.0, lng:-00.0, line:'One short line', about:'One or two sentences.' }
   lat/lng only place the pin; the Directions link always searches the full address.
   Every line and about below comes from the Tasting Rooms page or the distributor listings already on the site. */
window.TB_LOCATIONS = [
  { region:'Georgia', kind:'Distributor', name:'Beverage South', city:'Albany, GA', addr:'3900 Pecan Grove Ct, Albany, GA 31701', phone:'(229) 888-2390', tel:'+12298882390', lat:31.627, lng:-84.229, web:'https://bevsouth.com/distributors/beverage-south-albany/',
    line:'Our distributor in Georgia', about:'Bars, restaurants and stores in Georgia order Tiburón rum and FIN tequila through Beverage South.' },
  { region:'California', kind:'Distributor', name:'88 Spirits', city:'Ontario, CA', addr:'1707 S Grove Ave, Ste D, Ontario, CA 91761', phone:'(909) 786-1071', tel:'+19097861071', lat:34.043, lng:-117.625, web:'https://www.88spirits.com/',
    line:'Our distributor in California', about:'Bars, restaurants and stores in California order Tiburón rum and FIN tequila through 88 Spirits.' },
  { region:'Belize', kind:'Tasting room', name:'San Pedro', city:'Ambergris Caye', addr:'Barrier Reef Drive, next to Belize Bank, San Pedro', hours:'Every day, 10am to 7pm', short:'Open daily, 10 to 7', phone:'(847) 309-7700', tel:'+18473097700', lat:17.9213, lng:-87.9609, q:'Tiburon Rum Tasting Room San Pedro Belize', page:'tasting-rooms/#san-pedro',
    line:'Downtown on Barrier Reef Drive', about:'Next to Belize Bank. Bottles of the house infusions are on the shelves to take home, and if you have a special request, ask the team.' },
  { region:'Belize', kind:'Tasting room', name:'Placencia Village', city:'Southern coast', addr:'Main Street, Placencia Village', hours:'Every day, 10am to 6pm', short:'Open daily, 10 to 6', phone:'(847) 309-7700', tel:'+18473097700', lat:16.513742, lng:-88.3658819, q:'Tiburon Rum Placencia Tasting Room', page:'tasting-rooms/#placencia',
    line:'On Main Street, Placencia Village', about:'Come for a tasting, pick up a mixology tip from the team, or pop in for a T-shirt and a bottle to go.' },
  { region:'Belize', kind:'Tasting room', name:'Caye Caulker', city:'Near the water taxi', addr:'Corner of Avenida Hicaceno and Chapoose Street, Caye Caulker', hours:'Thursday to Sunday, 9am to 6pm', short:'Thu to Sun, 9 to 6', phone:'(847) 309-7700', tel:'+18473097700', lat:17.7449007, lng:-88.0235914, q:'Tiburon Rum Caye Caulker Tasting Room', page:'tasting-rooms/#caye-caulker',
    line:'A short walk from the water taxi', about:'Taste the range and the house infusions, then take home a bottle or a Tiburón tank top.' },
  { region:'Belize', kind:'Tasting room', name:'The Shark Shack', city:'San Ignacio, Cayo', addr:'Savannah Street, San Ignacio', hours:'Wednesday to Saturday, 9am to 6pm', short:'Wed to Sat, 9 to 6', phone:'(847) 309-7700', tel:'+18473097700', lat:17.1588152, lng:-89.0697736, q:'Tiburon Rum Cayo Tasting Room San Ignacio', page:'tasting-rooms/#san-ignacio',
    line:'Our only tasting room away from the coast', about:'On Savannah Street. Stop in before or after a day at the Maya sites and caves of Cayo.' }
];
