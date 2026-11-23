/* Where to find Tiburón: one record per place, grouped by region (a U.S. state or a country).
   Add retail stores here as Basil sends them (his Georgia list from Beverage South is still to come):
   { region:'Georgia', kind:'Retail', name:'Store name', addr:'Street, City, ST ZIP', phone:'(000) 000-0000', lat:00.0, lng:-00.0 }
   lat/lng only place the pin; the Directions link always searches the full address. */
window.TB_LOCATIONS = [
  { region:'Georgia', kind:'Distributor', name:'Beverage South', addr:'3900 Pecan Grove Ct, Albany, GA 31701', phone:'(229) 888-2390', tel:'+12298882390', lat:31.627, lng:-84.229, web:'https://bevsouth.com/distributors/beverage-south-albany/' },
  { region:'California', kind:'Distributor', name:'88 Spirits', addr:'1707 S Grove Ave, Ste D, Ontario, CA 91761', phone:'(909) 786-1071', tel:'+19097861071', lat:34.043, lng:-117.625, web:'https://www.88spirits.com/' },
  { region:'Belize', kind:'Tasting room', name:'San Pedro Tasting Room', addr:'Barrier Reef Drive, next to Belize Bank, San Pedro, Ambergris Caye', phone:'(847) 309-7700', tel:'+18473097700', lat:17.9213, lng:-87.9609, q:'Tiburon Rum Tasting Room San Pedro Belize', page:'tasting-rooms/#san-pedro' },
  { region:'Belize', kind:'Tasting room', name:'Placencia Tasting Room', addr:'Main Street, Placencia Village', phone:'(847) 309-7700', tel:'+18473097700', lat:16.513742, lng:-88.3658819, q:'Tiburon Rum Placencia Tasting Room', page:'tasting-rooms/#placencia' },
  { region:'Belize', kind:'Tasting room', name:'Caye Caulker Tasting Room', addr:'Corner of Avenida Hicaceno and Chapoose Street, Caye Caulker', phone:'(847) 309-7700', tel:'+18473097700', lat:17.7449007, lng:-88.0235914, q:'Tiburon Rum Caye Caulker Tasting Room', page:'tasting-rooms/#caye-caulker' },
  { region:'Belize', kind:'Tasting room', name:'San Ignacio: The Shark Shack', addr:'Savannah Street, San Ignacio, Cayo District', phone:'(847) 309-7700', tel:'+18473097700', lat:17.1588152, lng:-89.0697736, q:'Tiburon Rum Cayo Tasting Room San Ignacio', page:'tasting-rooms/#san-ignacio' }
];
