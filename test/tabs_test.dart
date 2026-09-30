import 'package:eden_garden_app/config.dart';
import 'package:eden_garden_app/tabs.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('website pages map to the right bottom tab', () {
    expect(tabIndexForPath('/'), 0);
    expect(tabIndexForPath('/stays/3/misty-hills'), 0);
    expect(tabIndexForPath('/booking/ABC123'), 0);
    expect(tabIndexForPath('/services'), 1);
    expect(tabIndexForPath('/services/4/cab'), 1);
    expect(tabIndexForPath('/homes-for-sale'), 2);
    expect(tabIndexForPath('/plots'), 2);
    expect(tabIndexForPath('/trips'), 3);
    expect(tabIndexForPath('/invoices/12'), 3);
    expect(tabIndexForPath('/login'), 4);
    expect(tabIndexForPath('/admin/bookings'), 4);
    expect(tabIndexForPath('/host/calendar'), 4);
    expect(tabIndexForPath('/referral/dashboard'), 4);
    expect(tabIndexForPath('/hostel'), null); // not "/host"
    expect(tabIndexForPath('/unknown'), null);
  });

  test('own host detection', () {
    expect(AppConfig.isOwnHost('edengardenshomestay.in'), true);
    expect(AppConfig.isOwnHost('www.edengardenshomestay.in'), true);
    expect(AppConfig.isOwnHost('secure.payu.in'), false);
  });
}
