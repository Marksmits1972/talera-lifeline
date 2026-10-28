/*
 V6 changes inside original TALERA_V4_HTML (no new date editor):
 1. New draft 'Vertel zonder foto's':
    const g={id:uid(),media:[],voice:'',date:today(),precision:'exact',dateSource:'creation',dateConfirmed:true,title:'',text:''};
 2. New group created while moving a photo: same defaults.
 3. After const made=makeGroups(rows):
    for(const g of made){g.date=today();g.precision='exact';g.dateSource='creation';g.dateConfirmed=true}
    Leave makeGroups's original date-based GROUPING unchanged; the memory date defaults to
    the user's LOCAL CURRENT DAY, not the EXIF shooting date. Explicit user adjustments to
    g.date are never overwritten after creation.
 4. datePicker and dateLabel already use g.date and g.precision; therefore the UI starts
    on exact today without forcing a date modal. Existing change-date button remains.
 5. Publish retains validDay validation and mem.save/mem.get verification in V5.
*/
