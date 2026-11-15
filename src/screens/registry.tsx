/* Every screen address (same as the native app's) → the screen that shows it. Params are read inside each screen with useParams(). */
import React, { ComponentType } from 'react';
import type { RouteName } from '../nav';
import ExploreScreen from './Explore';
import PetSearchScreen from './PetSearch';
import ChargersScreen from './Chargers';
import PlannerScreen, { MyPlacesScreen, PlaceEditScreen, SavedPlanScreen, SavedPlansScreen } from './Planner';
import { GroupJoinScreen, GroupsHub } from './Groups';
import GroupTripScreen from './TripHub';
import { TicketsScreen } from './Tickets';
import TripChatScreen from './TripChat';
import { NotifyPrefsScreen, WalletScreen } from './Wallet';
import TripRunScreen from './TripRun';
import TripsScreen, { BookingScreen } from './Trips';
import AiScreen from './Ai';
import AccountScreen from './Account';
import AuthScreen from './Auth';
import { MyPetsScreen, PetFormScreen, ProfileScreen, SavedPetsScreen } from './Pets';
import NotificationsScreen from './Notifications';
import ReserveScreen from './Reserve';
import PropertyScreen from './Property';
import PetListingScreen from './PetListing';
import PetBookingScreen from './PetBooking';
import { DeleteAccountScreen, PageScreen } from './Pages';
import { BecomeHostScreen, BecomePetHostScreen } from './Join';
import HostKycScreen from './HostKyc';
import HostingScreen, { HostChatsScreen } from './Hosting';
import { HostCheckinScreen } from './HostTools';
import { ChatScreen, ChatTokenScreen, HostChatScreen, MessagesScreen } from './Chat';
import PlaceScreen from './Places';
import OnlineCheckinScreen from './CheckIn';
import { PdfScreen, PetReceiptScreen, PhotoScreen, VideoScreen } from './Viewers';
import { PayScreen, SiteScreen } from './Web';

const SignUpScreen = () => <AuthScreen startSignUp />;

export const SCREENS: Record<RouteName, ComponentType<any>> = {
  'explore': ExploreScreen,
  'pets': PetSearchScreen,
  'chargers': ChargersScreen,
  'planner': PlannerScreen,
  'tripplans': SavedPlansScreen,
  'groups': GroupsHub,
  'group/{id}': GroupTripScreen,
  'tickets?msg={msg}': TicketsScreen,
  'groupchat/{id}': TripChatScreen,
  'groupjoin/{code}': GroupJoinScreen,
  'tripplan/{id}': SavedPlanScreen,
  'wallet': WalletScreen,
  'notifyprefs': NotifyPrefsScreen,
  'triprun/{id}': TripRunScreen,
  'myplaces': MyPlacesScreen,
  'placeedit/{id}': PlaceEditScreen,
  'trips': TripsScreen,
  'ai': AiScreen,
  'account': AccountScreen,
  'login': AuthScreen,
  'signup': SignUpScreen,
  'profile': ProfileScreen,
  'notifications': NotificationsScreen,
  'mypets': MyPetsScreen,
  'saved': SavedPetsScreen,
  'reserve': ReserveScreen,
  'property/{kind}/{id}': PropertyScreen,
  'booking/{ref}?paid={paid}&failed={failed}&refund={refund}': BookingScreen,
  'petlisting/{id}': PetListingScreen,
  'petbooking/{ref}?paid={paid}&failed={failed}&refund={refund}': PetBookingScreen,
  'petform/{id}': PetFormScreen,
  'page/{slug}': PageScreen,
  'delete-account': DeleteAccountScreen,
  'become-host': BecomeHostScreen,
  'hostkyc': HostKycScreen,
  'become-pet-host': BecomePetHostScreen,
  'hosting': HostingScreen,
  'site?path={path}&title={title}': SiteScreen,
  'hostcheckin/{id}': HostCheckinScreen,
  'hostchats': HostChatsScreen,
  'hostchat/{id}': HostChatScreen,
  'messages': MessagesScreen,
  'chatt/{token}': ChatTokenScreen,
  'place/{id}': PlaceScreen,
  'checkin?url={url}': OnlineCheckinScreen,
  'chat/{kind}/{id}': ChatScreen,
  'pdf?url={url}&title={title}': PdfScreen,
  'photo?url={url}&title={title}': PhotoScreen,
  'video?url={url}': VideoScreen,
  'petreceipt/{ref}': PetReceiptScreen,
  'pay': PayScreen,
};
