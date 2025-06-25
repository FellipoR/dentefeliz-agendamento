import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, isSameDay, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  name?: string;
  email?: string;
  username?: string;
  type: 'client' | 'admin';
}

interface Appointment {
  id: string;
  clientEmail: string;
  clientName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'cancelled';
}

interface SchedulingSystemProps {
  user: User;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const SchedulingSystem: React.FC<SchedulingSystemProps> = ({ 
  user, 
  onLogout, 
  isDarkMode, 
  toggleDarkMode 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    date?: Date;
    time?: string;
  }>({ open: false });
  const [limitDialog, setLimitDialog] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = () => {
    const storedAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    setAppointments(storedAppointments);
    
    if (user.type === 'client') {
      const userAppts = storedAppointments.filter(
        (apt: Appointment) => apt.clientEmail === user.email && apt.status === 'scheduled'
      );
      setUserAppointments(userAppts);
    }
  };

  const getBrasiliaTime = () => {
    const now = new Date();
    // Converter para horário de Brasília (UTC-3)
    const brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    return brasiliaTime;
  };

  const isTimeSlotAvailable = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSlotTaken = appointments.some(apt => 
      apt.date === dateStr && 
      apt.time === time && 
      apt.status === 'scheduled'
    );

    // Verificar se o horário já passou (considerando fuso de Brasília)
    const brasiliaTime = getBrasiliaTime();
    
    // Criar data/hora corretamente considerando o fuso de Brasília
    const [hours, minutes] = time.split(':').map(Number);
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    // Ajustar a data selecionada para o fuso de Brasília
    const selectedDateTimeBrasilia = new Date(selectedDateTime.getTime() - (3 * 60 * 60 * 1000));
    
    console.log('Checking time slot:', {
      date: dateStr,
      time,
      brasiliaTime: brasiliaTime.toISOString(),
      selectedDateTimeBrasilia: selectedDateTimeBrasilia.toISOString(),
      isInPast: selectedDateTimeBrasilia < brasiliaTime,
      isSlotTaken
    });

    const isInPast = selectedDateTimeBrasilia < brasiliaTime;

    return !isSlotTaken && !isInPast;
  };

  const getUserAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => 
      apt.date === dateStr && 
      apt.clientEmail === user.email && 
      apt.status === 'scheduled'
    );
  };

  const isWeekday = (date: Date) => {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  };

  const isPastDate = (date: Date) => {
    const brasiliaTime = getBrasiliaTime();
    brasiliaTime.setHours(0, 0, 0, 0);
    return isBefore(date, brasiliaTime);
  };

  const handleTimeSlotClick = (time: string) => {
    if (!selectedDate || !user.email) return;

    // Verificar se já tem 3 consultas no mesmo dia
    const appointmentsOnDate = getUserAppointmentsForDate(selectedDate);
    if (appointmentsOnDate.length >= 3) {
      setLimitDialog(true);
      return;
    }

    // Verificar novamente se o horário está disponível antes de abrir o diálogo
    if (!isTimeSlotAvailable(selectedDate, time)) {
      toast({
        title: "Horário indisponível",
        description: "Este horário já passou ou está ocupado.",
        variant: "destructive"
      });
      return;
    }

    setConfirmationDialog({
      open: true,
      date: selectedDate,
      time: time
    });
  };

  const confirmAppointment = () => {
    if (!confirmationDialog.date || !confirmationDialog.time || !user.email) return;

    // Verificar mais uma vez se o horário ainda está disponível
    if (!isTimeSlotAvailable(confirmationDialog.date, confirmationDialog.time)) {
      toast({
        title: "Erro no agendamento",
        description: "Este horário não está mais disponível.",
        variant: "destructive"
      });
      setConfirmationDialog({ open: false });
      return;
    }

    const dateStr = format(confirmationDialog.date, 'yyyy-MM-dd');
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      clientEmail: user.email,
      clientName: user.name || '',
      date: dateStr,
      time: confirmationDialog.time,
      status: 'scheduled'
    };

    const updatedAppointments = [...appointments, newAppointment];
    setAppointments(updatedAppointments);
    localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
    
    loadAppointments();
    
    toast({
      title: "Consulta agendada!",
      description: `Agendado para ${format(confirmationDialog.date, 'dd/MM/yyyy', { locale: ptBR })} às ${confirmationDialog.time}h`
    });

    setConfirmationDialog({ open: false });
  };

  const cancelAppointment = (appointmentId: string) => {
    const updatedAppointments = appointments.map(apt =>
      apt.id === appointmentId ? { ...apt, status: 'cancelled' as const } : apt
    );
    
    setAppointments(updatedAppointments);
    localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
    
    loadAppointments();
    
    toast({
      title: "Consulta cancelada",
      description: "Sua consulta foi cancelada com sucesso"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary">🦷 Dente Feliz</h1>
            <span className="text-muted-foreground">
              {user.type === 'admin' ? 'Painel Administrativo' : `Olá, ${user.name}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={toggleDarkMode}
              className="p-2"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </Button>
            <Button variant="outline" onClick={onLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {user.type === 'client' ? (
          // Client View
          <div className="grid md:grid-cols-2 gap-8">
            {/* Scheduling Section */}
            <Card>
              <CardHeader>
                <CardTitle>Agendar Consulta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Selecione uma data:</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => !isWeekday(date) || isPastDate(date)}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>
                  
                  {selectedDate && isWeekday(selectedDate) && !isPastDate(selectedDate) && (
                    <div>
                      <Label>Horários disponíveis para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}:</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {timeSlots.map(time => (
                          <Button
                            key={time}
                            variant={isTimeSlotAvailable(selectedDate, time) ? "outline" : "secondary"}
                            disabled={!isTimeSlotAvailable(selectedDate, time)}
                            onClick={() => handleTimeSlotClick(time)}
                            className="h-10"
                          >
                            {time}h
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* My Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Minhas Consultas</CardTitle>
              </CardHeader>
              <CardContent>
                {userAppointments.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma consulta agendada.</p>
                ) : (
                  <div className="space-y-3">
                    {userAppointments.map(apt => (
                      <div key={apt.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">
                            {format(new Date(apt.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-sm text-muted-foreground">{apt.time}h</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelAppointment(apt.id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Admin View
          <Card>
            <CardHeader>
              <CardTitle>Todos os Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.filter(apt => apt.status === 'scheduled').length === 0 ? (
                <p className="text-muted-foreground">Nenhuma consulta agendada.</p>
              ) : (
                <div className="space-y-3">
                  {appointments
                    .filter(apt => apt.status === 'scheduled')
                    .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime())
                    .map(apt => (
                      <div key={apt.id} className="flex justify-between items-center p-4 border rounded">
                        <div>
                          <p className="font-medium">{apt.clientName}</p>
                          <p className="text-sm text-muted-foreground">{apt.clientEmail}</p>
                          <p className="text-sm">
                            {format(new Date(apt.date), 'dd/MM/yyyy', { locale: ptBR })} às {apt.time}h
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information Section */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Informações Importantes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-base mb-2">Antes da Consulta</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Chegue 15 minutos antes do horário agendado</li>
                    <li>• Traga documentos pessoais (RG e CPF)</li>
                    <li>• Informe sobre medicamentos que está tomando</li>
                    <li>• Relate histórico de problemas dentários</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-base mb-2">Cancelamentos</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Cancele com pelo menos 24h de antecedência</li>
                    <li>• Use o sistema online ou ligue para a clínica</li>
                    <li>• Reagendamentos podem ser feitos pelo sistema</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-base mb-2">Formas de Pagamento</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Dinheiro, cartão de débito ou crédito</li>
                    <li>• PIX aceito</li>
                    <li>• Parcelamento disponível para tratamentos</li>
                    <li>• Convênios odontológicos aceitos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Additional Information */}
        <div className="mt-8">
          <Tabs defaultValue="dentist" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dentist">Sobre a Dentista</TabsTrigger>
              <TabsTrigger value="location">Localização</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dentist" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sobre a Dentista</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      👩‍⚕️
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl">Dra. Andrea Ribeiro</h3>
                      <p className="text-muted-foreground">CRO 54941-RJ</p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">Formação Acadêmica</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Graduação em Odontologia - Universidade Federal do Rio de Janeiro (UFRJ)</li>
                          <li>• Especialização em Implantodontia - Universidade Estadual do Rio de Janeiro (UERJ)</li>
                          <li>• Pós-graduação em Estética Dental - Pontifícia Universidade Católica do Rio de Janeiro (PUC-Rio)</li>
                          <li>• 15 anos de experiência clínica</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3">Redes Sociais</h4>
                        <div className="flex justify-center gap-3">
                          <Button variant="outline" size="sm">
                            📘 Facebook
                          </Button>
                          <Button variant="outline" size="sm">
                            📷 Instagram
                          </Button>
                          <Button variant="outline" size="sm">
                            💼 LinkedIn
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="location" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Localização</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-base mb-2">Clínica Dente Feliz</h4>
                        <p className="text-muted-foreground">
                          Padre Roser, 1153<br/>
                          Sobrado Irajá - Rio de Janeiro/RJ<br/>
                          CEP: 21235-140
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-base mb-2">Contato</h4>
                        <div className="text-muted-foreground space-y-1">
                          <p>📱 WhatsApp: (21) 96424-6191</p>
                          <p>✉️ Email: Andreaassuncao@yahoo.combr</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-base mb-2">Horário de Funcionamento</h4>
                        <div className="text-muted-foreground space-y-1">
                          <p>Segunda a Sexta: 8h às 18h</p>
                          <p>Sábado e Domingo: Fechado</p>
                          <p>Feriados: Consulte disponibilidade</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-base mb-2">Como Chegar</h4>
                        <p className="text-muted-foreground text-sm">
                          Localizada no bairro Irajá, zona norte do Rio de Janeiro. 
                          Próximo ao centro comercial da região.
                        </p>
                      </div>
                    </div>
                    <div className="h-80">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3675.4567!2d-43.3376!3d-22.8127!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x997e0da2b1234567%3A0x9876543210abcdef!2sPadre%20Roser%2C%201153%20-%20Iraj%C3%A1%2C%20Rio%20de%20Janeiro%20-%20RJ%2C%2021235-140!5e0!3m2!1spt-BR!2sbr!4v1640995200000!5m2!1spt-BR!2sbr"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialog.open} onOpenChange={(open) => setConfirmationDialog({ ...confirmationDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Agendamento</DialogTitle>
            <DialogDescription>
              Você deseja agendar uma consulta para:
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-lg font-medium">
              {confirmationDialog.date && format(confirmationDialog.date, 'dd/MM/yyyy', { locale: ptBR })}
            </p>
            <p className="text-lg font-medium">
              às {confirmationDialog.time}h
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmationDialog({ open: false })}>
              Cancelar
            </Button>
            <Button onClick={confirmAppointment}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limit Alert Dialog */}
      <AlertDialog open={limitDialog} onOpenChange={setLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limite de consultas atingido</AlertDialogTitle>
            <AlertDialogDescription>
              Você já possui 3 consultas agendadas para este dia. É permitido agendar no máximo 3 consultas por dia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setLimitDialog(false)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SchedulingSystem;
