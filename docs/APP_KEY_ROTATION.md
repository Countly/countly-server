# Rotating an application key

This guide explains how to change ("rotate") an application's key in Countly,
what happens to your existing data and users, and how to retire an old key
safely once it is no longer in use.

## What is the app key

Every Countly application has an **app key**. Your SDKs send this key with every
request so Countly knows which application the incoming data belongs to. Because
the key is shipped inside your apps (mobile builds, web pages, server
integrations), you may occasionally need to change it, for example if it was
exposed or as part of a routine security practice.

## What happens when you rotate a key

When you set a new app key, Countly does **not** discard the old one. Instead:

- The new key becomes the **current key**. New SDK setups should use it.
- The old key is **kept as an accepted key** and continues to work. Data sent
  with it is still accepted and attributed to the same application.
- Your **users and historical data are unaffected**. Visitors are recognised as
  the same users regardless of which key their app uses, so there are no
  duplicate users and no reset of returning/new user counts.

This means you can roll out a new key gradually. Clients that have already been
updated start using the new key, while older clients that you cannot update
immediately (for example mobile app versions still in use) keep working on the
old key until they are upgraded or naturally retire.

## How to rotate a key

1. Open **Management → Applications** and select the application.
2. Edit the application and set a new **App key**, then save.
3. Update your SDK configuration / integrations to use the new key wherever you
   can. New installs and deployments should use the new key.

The new key takes effect immediately, and the previous key remains accepted.

A key must be unique across all applications, including keys that are still
accepted from previous rotations. If you choose a value already in use, the save
is rejected.

## Seeing which keys are still receiving data

In the application's key management view you will see the **list of accepted
keys** for the app. For each key, Countly shows the **last time data was
received** using that key. This lets you tell, at a glance, whether an old key
is still being used by clients in the field.

The "last received" time is updated as data arrives, so a key that no longer
shows recent activity is a good candidate for removal.

## Retiring an old key

When you are confident an old key is no longer needed (for example its "last
received" time stopped advancing some time ago, after your client population has
upgraded), you can remove it:

1. Open the application's key management view.
2. Remove the old key from the list of accepted keys and save.

Once removed, that key is no longer accepted: requests sent with it are rejected
as if the application did not exist. The **current key cannot be removed** — an
application always has at least one accepted key.

There is no fixed deadline to remove an old key. You can keep it as long as you
need and retire it whenever you decide it is safe.

## Recommended approach

1. Set the new key and start using it for new deployments.
2. Roll the new key out to your clients/integrations over time.
3. Watch the "last received" time on the old key.
4. When the old key has been quiet long enough for your situation, remove it.

## Frequently asked questions

**Will rotating the key lose any data or reset my users?**
No. Existing data is preserved and users continue to be recognised as the same
users across the change.

**Do I have to update all my clients at the same time?**
No. The old key keeps working until you remove it, so you can migrate clients at
your own pace.

**Can two applications share a key?**
No. Each key (current or previously accepted) must be unique across all
applications.

**What happens to requests sent with a removed key?**
They are rejected. Make sure no clients you care about are still using a key
before you remove it — the "last received" time is there to help you decide.
