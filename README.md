This is a NodeJS module that sits above the node-bacstack module and abstracts
the interface somewhat, making it easier to implement a BACnet device in Node.

This module takes care of listening for and responding to BACnet packets, as
well as managing subscriptions (push notifications), sending updates as values
are changed.

The module is designed to function as a BACnet device only, providing data that
is queried by another system, such as a Building Management System.  There is
no functionality for retrieving data from other BACnet devices, however there
is nothing stopping you from using the underlying node-bacstack module for
this if needed.

The BACnet device powered by this code can be addressed directly, or as if it
were a BBMD with a single device behind it.  This is mainly useful for
interfacing it with JCI Metasys, which cannot talk to remote BACnet nodes
directly, only BBMD nodes.  By adding this to Metasys as a BBMD, the device
you implement will appear as a single device in the subnet behind the BBMD.

This BBMD functionality is actually provided by node-bacstack rather than this
module.
