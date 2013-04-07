---
layout: post
title: "Adding a 'dry run' capability to your Moose class with MooseX::Role::DryRunnable"
date: 2013-04-07 09:55
comments: true
categories: [Perl, AOP, Moose]
---

A 'dry run' is a testing process where the effects of a possible failure are intentionally mitigated. For example, an aerospace company may conduct a "dry run" test of a jet's new pilot ejection seat while the jet is parked on the ground, rather than while it is in flight. Or, in software development, we can change the behavior of some methods in order to test, like avoid change data into a database (logging the action instead).

There are many ways to implement this capability. For example, we can add an explicity return in each method and test some condition. I will show some options in this article and we will find how to use the module [MooseX::Role::DryRunnable](https://metacpan.org/module/MooseX::Role::DryRunnable) in our Moose classes (Perl).

One simple example in Perl, reading from an environment variable `DRY_RUN`.

```perl

package Foo;

sub bar {
	logger->debug("Foo::bar @_");
	return if $ENV{'DRY_RUN'};
	...
}
```

<!--more-->

In this example, the `bar` method change something in the database and my test is very simple, like a simple diff between log files. To test my application in dry run (to test in the product environment, for example, without a big risk), we can do this:

```
bash$ DRY_RUN=1 ./my-application.pl --other-options
```

Sounds good, for large systems, with a good number of modules, it can be a problem. For example, the method `bar` has two or three responsabilities: logging the parameters, doing the original job and do nothing if we are in the `dry run` state. This method is doing a lot of things, and I have the same code in multiple places. Lets think about reuse of this code, using OO principles.

```perl

package FooBase;

sub bar {
	...
}

package Foo;
use base 'FooBase';

sub bar {
	logger->debug("Foo::bar @_");
	return if $ENV{'DRY_RUN'};
	
	my $self = shift;
	$self->SUPER::bar(@_);
}
```

Now it is interesting: my Foo class has just one job: dispatch (or not) the method call to FooBase (who knows our business rule). But we still have the problem of the same code in multiple places. Lets try to solve this with Aspect Oriented Programming, using Moose.

```perl
package Foo;
use Moose;

sub bar {
	...
}

sub baz {
	...
}

around [ qw(bar baz) ] => sub {
	my $orig = shift;
    my $self = shift;

	logger->debug("Foo::bar @_");
	return if $ENV{'DRY_RUN'};
	
	$self->$orig(@_)
}
```

Moose is a complete object system for Perl 5. Consider any modern object-oriented language (which Perl 5 definitely isn't). It provides keywords for attribute declaration, object construction, inheritance, and maybe more. In this example, we can use the Method Modifier `around` and we can inject this new piece of code in one or more methods. But we still need add this hook in each class, this is why I create the [MooseX::Role::DryRunnable](https://metacpan.org/module/MooseX::Role::DryRunnable).

Moose has a great number of features, like Roles. Roles have two primary purposes: as interfaces, and as a means of code reuse. In our example we can do this:

```perl
package DryRunnable;
use Moose::Role;

requires 'in_dry_run';
requires 'on_dry_run';

package Foo;
use Moose;
with 'DryRunnable';

sub bar {
	...
}

sub baz {
	...
}

sub is_dry_run {
	$ENV{'DRY_RUN'}
}

sub on_dry_run {
	logger->debug("Foo::bar @_")
}

around [ qw(bar baz) ] => sub {
	my $orig = shift;
    my $self = shift;

	$self->is_dry_run()
		? $self->on_dry_run(@_)
		: $self->$orig(@_)
}
```

In this example, the role DryRunnable provides the basic infrastructure to add the dry run capability. Instead ask direclty to an environment variable I'm asking to a method ( `is_dry_run` ), and instead only log / return nothing we call another method to do this ( `on_dry_run` ). Using this kind of pattern it is easy to inject the correct `around` statement using, for example, [MooseX::Role::Parameterized](https://metacpan.org/module/MooseX::Role::Parameterized). With a parameterized role, we can set the list of methods in a Objected Oriented way, with more code reuse and less copy/paste. This is the base of [MooseX::Role::DryRunnable](https://metacpan.org/module/MooseX::Role::DryRunnable).

```perl
package Foo;
use Moose;
 
with 'MooseX::Role::DryRunnable' => { 
  methods => [ qw(bar baz) ]
};
 
has dry_run => (is => 'ro', isa => 'Bool', default => 0);
 
sub bar {
	...
}
 
sub baz {
	...
}

sub is_dry_run { # required, should return a boolean
  shift->dry_run
}
 
sub on_dry_run { # required, will receive the name of the method and the list of arguments
  my $self   = shift;
  my $method = shift;
  $self->logger("Dry Run method=$method, args: \n", @_);
}
```

The code of this role is simple, and we can set the list of the methods as a parameter.

```perl
package MooseX::Role::DryRunnable;
use MooseX::Role::Parameterized;
 
parameter methods => (
  traits  => ['Array'],
  is      => 'ro',
  isa     => 'ArrayRef[Str]',
  default => sub { [] },
  handles => { all_methods => 'elements' },
);
 
role {
  my $p = shift;
   
  requires 'is_dry_run';
  requires 'on_dry_run';
   
  foreach my $method ($p->all_methods){
    around $method => sub { 
        my $code  = shift;
        my $self  = shift;
 
        $self->is_dry_run() 
          ? $self->on_dry_run($method,@_) 
          : $self->$code->(@_)  
      }
  }
};
 
1;
```

I can extend the original role to provide a basic version of `is_dry_run` and `on_dry_run` for my set of Moose classes and write less code, overriding if I need something more specific for some class. And this is how we can deal with Aspect Oriented Programming in Perl, using Moose.

But this is not the only way to do this. I can use [Monkey::Patch](https://metacpan.org/module/Monkey::Patch) or  [Aspect](https://metacpan.org/module/Aspect) to add the same behavior, there are many good options to do the same thing. 

And there are many applications of this technique. If we identify a good reason to change the behavior of some class in runtime, like activate some modules or features (based on configuration, timedate, environment variables, etc), we can do something like this.